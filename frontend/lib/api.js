const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export async function uploadDocument(file, chatId = null) {
  const formData = new FormData();
  formData.append("file", file);
  if (chatId) {
    formData.append("chat_id", chatId);
  }

  const response = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data.detail || data.message || "Upload failed";
    throw new Error(error);
  }

  return data;
}

export async function queryDocument(question, history = [], chatId = null) {
  const response = await fetch(`${API_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history, chat_id: chatId }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data.detail || data.message || "Query failed";
    throw new Error(error);
  }

  return data;
}

export async function getChats() {
  const response = await fetch(`${API_URL}/api/chats`);
  if (!response.ok) throw new Error("Failed to load chats");
  return (await response.json()).chats;
}

export async function createChat(title = "New conversation") {
  const response = await fetch(`${API_URL}/api/chats`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
  if (!response.ok) throw new Error("Failed to create chat");
  return response.json();
}

export async function getChatMessages(chatId) {
  const response = await fetch(`${API_URL}/api/chats/${chatId}/messages`);
  if (!response.ok) throw new Error("Failed to load chat messages");
  return (await response.json()).messages;
}

export async function deleteChat(chatId) {
  const response = await fetch(`${API_URL}/api/chats/${chatId}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete chat");
  return true;
}

export async function getDocumentCount(chatId = null) {
  const url = chatId
    ? `${API_URL}/api/documents/count?chat_id=${encodeURIComponent(chatId)}`
    : `${API_URL}/api/documents/count`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch document count");
  }

  const data = await response.json();
  return data.count;
}
