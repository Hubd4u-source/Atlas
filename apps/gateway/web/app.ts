type MaybeElement<T extends HTMLElement> = T | null;

const statusEl = document.getElementById("status") as MaybeElement<HTMLDivElement>;
const connectionStatusEl = document.getElementById("connection-status") as MaybeElement<HTMLSpanElement>;
const connectionDotEl = document.getElementById("connection-dot") as MaybeElement<HTMLSpanElement>;
const messagesEl = document.getElementById("messages") as MaybeElement<HTMLDivElement>;
const sessionEl = document.getElementById("session-id") as MaybeElement<HTMLDivElement>;
const composer = document.getElementById("composer") as MaybeElement<HTMLFormElement>;
const input = document.getElementById("message-input") as MaybeElement<HTMLInputElement>;
const urlInput = document.getElementById("gateway-url") as MaybeElement<HTMLInputElement>;
const tokenInput = document.getElementById("auth-token") as MaybeElement<HTMLInputElement>;
const chatIdInput = document.getElementById("chat-id") as MaybeElement<HTMLInputElement>;
const connectBtn = document.getElementById("connect-btn") as MaybeElement<HTMLButtonElement>;
const disconnectBtn = document.getElementById("disconnect-btn") as MaybeElement<HTMLButtonElement>;

const defaultUrl = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;
if (urlInput) urlInput.value = localStorage.getItem("ag_gateway_url") || defaultUrl;
if (tokenInput) tokenInput.value = localStorage.getItem("ag_auth_token") || "";
if (chatIdInput) {
  chatIdInput.value = localStorage.getItem("ag_chat_id") || `web-${Math.random().toString(36).slice(2, 8)}`;
  if (sessionEl) sessionEl.textContent = `Session: ${chatIdInput.value}`;
}

type ConnectionState = {
  url: string;
  token: string;
  chatId: string;
  connected: boolean;
};

let socket: WebSocket | null = null;

const STORAGE_KEY = "ag_connection_state";

const saveState = (state: ConnectionState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const loadState = (): ConnectionState | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ConnectionState;
  } catch {
    return null;
  }
};

const hydrateFromState = () => {
  const state = loadState();
  if (!state) return;
  if (urlInput && state.url) urlInput.value = state.url;
  if (tokenInput && state.token) tokenInput.value = state.token;
  if (chatIdInput && state.chatId) chatIdInput.value = state.chatId;
  if (sessionEl && state.chatId) sessionEl.textContent = `Session: ${state.chatId}`;
  setStatus(state.connected ? "Connected" : "Disconnected", state.connected);
};

const setStatus = (text: string, ok = false) => {
  if (statusEl) {
    statusEl.textContent = text;
    statusEl.style.color = ok ? "var(--success)" : "var(--muted)";
  }
  if (connectionStatusEl) {
    connectionStatusEl.textContent = text;
    connectionStatusEl.style.color = ok ? "var(--success)" : "var(--muted)";
  }
  if (connectionDotEl) {
    connectionDotEl.style.background = ok ? "var(--success)" : "var(--warning)";
  }
};

const addMessage = (role: "user" | "assistant", content: string) => {
  if (!messagesEl) return;
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role}`;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = role === "user" ? "You" : "Agent";

  const body = document.createElement("div");
  body.textContent = content;

  wrapper.appendChild(meta);
  wrapper.appendChild(body);
  messagesEl.appendChild(wrapper);
  messagesEl.scrollTop = messagesEl.scrollHeight;
};

const connect = () => {
  if (socket && socket.readyState === WebSocket.OPEN) return;

  const stored = loadState();
  const url = urlInput?.value.trim() || stored?.url || "";
  const token = tokenInput?.value.trim() || stored?.token || "";
  const chatId = chatIdInput?.value.trim() || stored?.chatId || "";

  if (!url || !token) {
    setStatus("Disconnected");
    return;
  }

  localStorage.setItem("ag_gateway_url", url);
  localStorage.setItem("ag_auth_token", token);
  if (chatId) localStorage.setItem("ag_chat_id", chatId);
  if (sessionEl && chatId) sessionEl.textContent = `Session: ${chatId}`;
  if (urlInput) urlInput.value = url;
  if (tokenInput) tokenInput.value = token;
  if (chatIdInput) chatIdInput.value = chatId;
  saveState({ url, token, chatId, connected: false });

  socket = new WebSocket(url);
  setStatus("Connecting...");

  socket.onopen = () => {
    setStatus("Connected", true);
    saveState({ url, token, chatId, connected: true });
    socket?.send(
      JSON.stringify({
        type: "auth",
        token,
        channel: "web",
      })
    );
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data?.content?.text) {
        addMessage("assistant", data.content.text);
      }
    } catch (err) {
      console.error("Failed to parse message", err);
    }
  };

  socket.onclose = () => {
    setStatus("Disconnected");
    saveState({ url, token, chatId, connected: false });
  };

  socket.onerror = () => {
    setStatus("Connection error");
    saveState({ url, token, chatId, connected: false });
  };
};

const disconnect = () => {
  if (socket) {
    socket.close();
    socket = null;
  }
  const url = urlInput?.value.trim() || "";
  const token = tokenInput?.value.trim() || "";
  const chatId = chatIdInput?.value.trim() || "";
  saveState({ url, token, chatId, connected: false });
};

composer?.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input?.value.trim() || "";
  if (!text || !socket || socket.readyState !== WebSocket.OPEN) return;

  const chatId = chatIdInput?.value.trim() || "";
  addMessage("user", text);
  socket.send(
    JSON.stringify({
      type: "message",
      channel: "web",
      chatId,
      content: { text },
    })
  );
  if (input) input.value = "";
});

connectBtn?.addEventListener("click", connect);
disconnectBtn?.addEventListener("click", disconnect);

hydrateFromState();
const initial = loadState();
if (initial?.connected) {
  connect();
}
