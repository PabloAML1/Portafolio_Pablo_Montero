import { createServer } from "node:http";
import { createLiveChat } from "./live-chat.mjs";

const port = Number(process.env.PORT || 8787);
const origins = new Set((process.env.CHAT_ALLOWED_ORIGINS || "http://localhost:4321,http://127.0.0.1:4321")
  .split(",").map((origin) => origin.trim()).filter(Boolean));

createServer({ requestTimeout: 10000 }, createLiveChat({ origins })).listen(port, "0.0.0.0", () => {
  console.log(`Live chat listening on port ${port}`);
});
