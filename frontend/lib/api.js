const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export function getToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleUnauthorized(response) {
  if (response.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.reload();
    }
    throw new Error("Unauthorized");
  }
  return response;
}

export async function loginUser(username, password) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Login failed");
  return data;
}

export async function registerUser(username, password) {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Registration failed");
  return data;
}

export async function uploadDocument(file, chatId = null) {
  const formData = new FormData();
  formData.append("file", file);
  if (chatId) {
    formData.append("chat_id", chatId);
  }

  const response = await handleUnauthorized(await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  }));

  const data = await response.json();

  if (!response.ok) {
    const error = data.detail || data.message || "Upload failed";
    throw new Error(error);
  }

  return data;
}

export async function queryDocument(question, history = [], chatId = null) {
  const response = await handleUnauthorized(await fetch(`${API_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ question, history, chat_id: chatId }),
  }));

  const data = await response.json();

  if (!response.ok) {
    const error = data.detail || data.message || "Query failed";
    throw new Error(error);
  }

  return data;
}

export async function getChats() {
  const response = await handleUnauthorized(await fetch(`${API_URL}/api/chats`, { headers: authHeaders() }));
  if (!response.ok) throw new Error("Failed to load chats");
  return (await response.json()).chats;
}

export async function createChat(title = "New conversation") {
  const response = await handleUnauthorized(await fetch(`${API_URL}/api/chats`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ title }),
  }));
  if (!response.ok) throw new Error("Failed to create chat");
  return response.json();
}

export async function getChatMessages(chatId) {
  const response = await handleUnauthorized(await fetch(`${API_URL}/api/chats/${chatId}/messages`, { headers: authHeaders() }));
  if (!response.ok) throw new Error("Failed to load chat messages");
  return (await response.json()).messages;
}

export async function deleteChat(chatId) {
  const response = await handleUnauthorized(await fetch(`${API_URL}/api/chats/${chatId}`, {
    method: "DELETE",
    headers: authHeaders(),
  }));
  if (!response.ok) throw new Error("Failed to delete chat");
  return true;
}

export async function getDocumentCount(chatId = null) {
  const url = chatId
    ? `${API_URL}/api/documents/count?chat_id=${encodeURIComponent(chatId)}`
    : `${API_URL}/api/documents/count`;
  const response = await handleUnauthorized(await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...authHeaders() },
  }));

  if (!response.ok) {
    throw new Error("Failed to fetch document count");
  }

  const data = await response.json();
  return data.count;
}

export function saveToken(token) {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
  }
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
}

export function getUser() {
  if (typeof window !== "undefined") {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  }
  return null;
}

export function saveUser(user) {
  if (typeof window !== "undefined") {
    localStorage.setItem("user", JSON.stringify(user));
  }
}
