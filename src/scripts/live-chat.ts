import { getTranslation } from "./i18n";

type Profile = { name: string; avatar: string };
type Person = Profile & { id: string };
type ChatMessage = { id: string; author: Person; text: string; at: number };
type Session = { id: string; token: string };

const root = document.querySelector<HTMLElement>("[data-live-chat]");
if (root) initChat(root);

function initChat(root: HTMLElement) {
  const endpoint = root.dataset.liveChat?.replace(/\/$/, "");
  const trigger = root.querySelector<HTMLButtonElement>("[data-chat-open]")!;
  const dialog = root.querySelector<HTMLDialogElement>("[data-chat-dialog]")!;
  const count = root.querySelector<HTMLElement>("[data-chat-count]")!;
  const status = root.querySelector<HTMLElement>("[data-chat-status]")!;
  const joinForm = root.querySelector<HTMLFormElement>("[data-chat-join]")!;
  const room = root.querySelector<HTMLElement>("[data-chat-room]")!;
  const peopleList = root.querySelector<HTMLElement>("[data-chat-people]")!;
  const thread = root.querySelector<HTMLElement>("[data-chat-thread]")!;
  const messageList = root.querySelector<HTMLElement>("[data-chat-messages]")!;
  const empty = root.querySelector<HTMLElement>("[data-chat-empty]")!;
  const compose = root.querySelector<HTMLFormElement>("[data-chat-compose]")!;
  const error = root.querySelector<HTMLElement>("[data-chat-error]")!;
  const nickname = joinForm.elements.namedItem("name") as HTMLInputElement;
  const input = compose.elements.namedItem("message") as HTMLInputElement;
  const joinButton = joinForm.querySelector<HTMLButtonElement>("button[type=submit]")!;
  const sendButton = compose.querySelector<HTMLButtonElement>("button[type=submit]")!;
  if (!endpoint || !window.EventSource) return;

  const avatars = new Map(Array.from(root.querySelectorAll<HTMLElement>(".chat-avatars [data-avatar]"), (avatar) => [
    avatar.dataset.avatar!, avatar.textContent ?? "",
  ]));
  let stream: EventSource | undefined;
  let session: Session | undefined;
  let profile: Profile | undefined;
  let online: number | undefined;
  let connection = "chat.connecting";
  let joined = false;
  let joining = false;
  let sending = false;

  const update = () => {
    count.textContent = online === undefined ? "—" : String(online);
    status.textContent = online === undefined ? getTranslation(connection)
      : getTranslation(online === 1 ? "chat.onlineOne" : "chat.onlineMany").replace("{count}", String(online));
    joinButton.disabled = !session || joining;
    sendButton.disabled = !joined || sending;
    joinForm.hidden = Boolean(profile);
    room.hidden = !profile;
  };

  const showError = (key?: string) => {
    error.hidden = !key;
    if (key) {
      error.dataset.i18n = key;
      error.textContent = getTranslation(key);
    }
  };

  const avatarFor = (person: Person) => {
    const avatar = document.createElement("span");
    avatar.className = "chat-avatar-mark";
    avatar.dataset.avatar = person.avatar;
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = avatars.get(person.avatar) ?? "•";
    return avatar;
  };

  const renderPeople = (people: Person[]) => {
    peopleList.replaceChildren(...people.map((person) => {
      const item = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = person.name;
      item.append(avatarFor(person), label);
      return item;
    }));
  };

  const addMessage = (message: ChatMessage, scrollToEnd: boolean) => {
    const item = document.createElement("li");
    const content = document.createElement("div");
    const author = document.createElement("strong");
    const body = document.createElement("p");
    author.textContent = message.author.name;
    body.textContent = message.text;
    content.append(author, body);
    item.append(avatarFor(message.author), content);
    messageList.append(item);
    if (messageList.childElementCount > 30) messageList.firstElementChild?.remove();
    empty.hidden = true;
    if (scrollToEnd) thread.scrollTop = thread.scrollHeight;
  };

  const post = (operation: string, token: string, data: Record<string, string>) => fetch(`${endpoint}/${operation}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, ...data }),
  });

  const join = async (details: Profile) => {
    const current = session;
    if (!current) return;
    joining = true;
    showError();
    update();
    try {
      const response = await post("join", current.token, details);
      if (session !== current) return;
      if (!response.ok) {
        showError(response.status === 400 ? "chat.invalid" : "chat.network");
        return;
      }
      const focusComposer = dialog.open && joinForm.contains(document.activeElement);
      profile = details;
      joined = true;
      update();
      thread.scrollTop = thread.scrollHeight;
      if (focusComposer) input.focus();
    } catch {
      showError("chat.network");
    } finally {
      joining = false;
      update();
    }
  };

  const connect = () => {
    renderPeople([]);
    const connectionStream = new EventSource(endpoint);
    stream = connectionStream;
    connectionStream.addEventListener("welcome", (event) => {
      session = JSON.parse((event as MessageEvent<string>).data) as Session;
      messageList.replaceChildren();
      empty.hidden = false;
      update();
      if (profile) void join(profile);
    });
    connectionStream.addEventListener("history", (event) => {
      const history = JSON.parse((event as MessageEvent<string>).data) as ChatMessage[];
      history.forEach((message) => addMessage(message, false));
      thread.scrollTop = thread.scrollHeight;
    });
    connectionStream.addEventListener("presence", (event) => {
      const presence = JSON.parse((event as MessageEvent<string>).data) as { online: number; people: Person[] };
      online = presence.online;
      renderPeople(presence.people);
      update();
    });
    connectionStream.addEventListener("message", (event) => {
      const message = JSON.parse((event as MessageEvent<string>).data) as ChatMessage;
      const nearBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 48;
      addMessage(message, nearBottom || message.author.id === session?.id);
    });
    connectionStream.addEventListener("error", () => {
      session = undefined;
      online = undefined;
      joined = false;
      connection = connectionStream.readyState === EventSource.CLOSED ? "chat.unavailable" : "chat.reconnecting";
      update();
    });
  };

  joinForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (joining) return;
    const data = new FormData(joinForm);
    void join({ name: nickname.value.trim(), avatar: String(data.get("avatar") ?? "") });
  });

  compose.addEventListener("submit", async (event) => {
    event.preventDefault();
    const current = session;
    const text = input.value.trim();
    if (!current || !joined || sending || !text) return;
    sending = true;
    showError();
    update();
    try {
      const response = await post("message", current.token, { text });
      if (response.ok) input.value = "";
      else showError(response.status === 429 ? "chat.rate" : "chat.network");
    } catch {
      showError("chat.network");
    } finally {
      sending = false;
      update();
      if (dialog.open) input.focus();
    }
  });

  trigger.addEventListener("click", () => {
    if (stream?.readyState === EventSource.CLOSED) connect();
    dialog.showModal();
    trigger.setAttribute("aria-expanded", "true");
    (joined ? input : nickname).focus();
    thread.scrollTop = thread.scrollHeight;
  });
  root.querySelector("[data-chat-close]")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const { left, right, top, bottom } = dialog.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) dialog.close();
  });
  dialog.addEventListener("close", () => {
    trigger.setAttribute("aria-expanded", "false");
    trigger.focus({ preventScroll: true });
  });

  window.addEventListener("language-change", update);
  window.addEventListener("pagehide", () => stream?.close());
  window.addEventListener("pageshow", (event) => { if (event.persisted) connect(); });
  update();
  connect();
}
