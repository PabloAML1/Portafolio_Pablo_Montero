import { randomUUID } from "node:crypto";

const route = "/api/live-chat";
const avatarIds = new Set(["sun", "moon", "leaf", "bolt", "feather", "key"]);
const maxBodyBytes = 2048;
const maxHistory = 30;
const maxConnections = 100;

export function createLiveChat({ origins } = {}) {
  const clients = new Map();
  const messages = [];
  let ping;

  const send = (client, event, value) => {
    if (!client.response.write(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`)) {
      client.response.destroy();
    }
  };
  const publishPresence = () => {
    const people = [...clients.values()].flatMap(({ profile }) => profile ? [profile] : []);
    for (const client of clients.values()) {
      send(client, "presence", { online: clients.size, people: client.profile ? people : [] });
    }
  };
  const remove = (client) => {
    if (!clients.delete(client.token)) return;
    if (!clients.size) {
      messages.length = 0;
      clearInterval(ping);
      ping = undefined;
      return;
    }
    publishPresence();
  };

  const openStream = (response) => {
    if (clients.size >= maxConnections) return json(response, 503, { error: "unavailable" });

    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "Connection": "keep-alive",
    });
    response.flushHeaders();
    const client = { id: randomUUID(), token: randomUUID(), response, nextMessageAt: 0 };
    response.on("close", () => remove(client));
    clients.set(client.token, client);
    send(client, "welcome", { id: client.id, token: client.token });
    publishPresence();
    ping ??= setInterval(() => {
      for (const { response: stream } of clients.values()) {
        if (!stream.write(": keepalive\n\n")) stream.destroy();
      }
    }, 15000);
    ping.unref();
  };

  const receive = async (request, response, path) => {
    if (!request.headers["content-type"]?.startsWith("application/json")) {
      return json(response, 415, { error: "invalid" });
    }
    try {
      const data = await readBody(request);
      if (!data || typeof data !== "object") return json(response, 400, { error: "invalid" });
      const client = typeof data.token === "string" && clients.get(data.token);
      if (!client) return json(response, 409, { error: "disconnected" });

      if (path === `${route}/join`) {
        if (client.profile) return json(response, 200, client.profile);
        const name = typeof data.name === "string" ? data.name.trim().replace(/\s+/g, " ") : "";
        if (!name || name.length > 24 || /[\p{Cc}\p{Cf}]/u.test(name) || !avatarIds.has(data.avatar)) {
          return json(response, 400, { error: "invalid" });
        }
        client.profile = { id: client.id, name, avatar: data.avatar };
        send(client, "history", messages);
        publishPresence();
        return json(response, 200, client.profile);
      }

      if (!client.profile) return json(response, 403, { error: "join" });
      const message = typeof data.text === "string" ? data.text.trim() : "";
      if (!message || message.length > 280) return json(response, 400, { error: "invalid" });
      const now = Date.now();
      if (now < client.nextMessageAt) return json(response, 429, { error: "rate" });
      client.nextMessageAt = now + 900;

      const entry = { id: randomUUID(), author: client.profile, text: message, at: now };
      messages.push(entry);
      if (messages.length > maxHistory) messages.shift();
      for (const visitor of clients.values()) {
        if (visitor.profile) send(visitor, "message", entry);
      }
      return json(response, 201, { id: entry.id });
    } catch {
      if (!response.destroyed) json(response, 400, { error: "invalid" });
    }
  };

  return (request, response, next = () => json(response, 404, { error: "notFound" })) => {
    const path = request.url?.split("?")[0];
    if (path !== route && path !== `${route}/join` && path !== `${route}/message`) return next();

    const requestOrigin = request.headers.origin;
    if (requestOrigin) {
      const accepted = origins
        ? origins.has(requestOrigin)
        : requestOrigin === `http://${request.headers.host}` || requestOrigin === `https://${request.headers.host}`;
      if (!accepted) return json(response, 403, { error: "origin" });
      response.setHeader("Access-Control-Allow-Origin", requestOrigin);
      response.setHeader("Vary", "Origin");
    }

    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      response.end();
      return;
    }
    if (request.method === "GET" && path === route) return openStream(response);
    if (request.method === "POST" && path !== route) return void receive(request, response, path);
    return json(response, 405, { error: "method" });
  };
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      request.resume();
      throw new Error("Request body too large");
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function json(response, status, value) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(value));
}
