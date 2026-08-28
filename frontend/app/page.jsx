"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import UploadBox from "@/components/UploadBox";
import ChatWindow from "@/components/ChatWindow";
import Sidebar from "@/components/Sidebar";
import AuthPage from "@/components/AuthPage";
import {
  queryDocument,
  getDocumentCount,
  getChats,
  createChat,
  getChatMessages,
  deleteChat,
  getToken,
  getUser,
  clearToken,
} from "@/lib/api";
import {
  Layers,
  Send,
  Trash2,
  Menu,
  Plus,
  LogOut,
} from "lucide-react";

export default function Home() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [savedChats, setSavedChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [docCount, setDocCount] = useState(null);
  const [inputError, setInputError] = useState("");
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const uploadBoxRef = useRef(null);

  useEffect(() => {
    const token = getToken();
    const savedUser = getUser();
    if (token && savedUser) {
      setUser(savedUser);
    }
    setIsAuthLoading(false);
  }, []);

  const handleAuthSuccess = useCallback((userData) => {
    setUser(userData);
  }, []);

  const handleLogout = useCallback(() => {
    clearToken();
    setUser(null);
    setMessages([]);
    setSavedChats([]);
    setActiveChatId(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getChats().then(async (chats) => {
      if (cancelled) return;
      if (chats.length) {
        setSavedChats(chats);
        setActiveChatId(chats[0].id);
        setMessages(await getChatMessages(chats[0].id));
      } else {
        const first = await createChat();
        if (!cancelled) {
          setSavedChats([first]);
          setActiveChatId(first.id);
        }
      }
    }).catch((err) => {
      if (err.message === "Unauthorized") {
        handleLogout();
      } else {
        setInputError("Could not connect to the chat database.");
      }
    });
    return () => { cancelled = true; };
  }, [handleLogout]);

  useEffect(() => {
    if (!activeChatId || !messages.length) return;
    setSavedChats((current) => current.map((chat) =>
      chat.id === activeChatId ? { ...chat, messages } : chat
    ));
  }, [messages, activeChatId]);

  const handleCreateChat = useCallback(async () => {
    try {
      const chat = await createChat();
      setSavedChats((current) => [chat, ...current]);
      setActiveChatId(chat.id);
      setMessages([]);
      setInputError("");
    } catch { setInputError("Could not create a new chat."); }
  }, []);

  const selectChat = useCallback(async (chat) => {
    setActiveChatId(chat.id);
    try { setMessages(await getChatMessages(chat.id)); } catch { setMessages([]); }
    setInputError("");
  }, []);

  const handleDeleteChat = useCallback(async (chatId) => {
    try {
      await deleteChat(chatId);
      setSavedChats((current) => {
        const remaining = current.filter((c) => c.id !== chatId);
        if (chatId === activeChatId) {
          if (remaining.length > 0) {
            setActiveChatId(remaining[0].id);
            getChatMessages(remaining[0].id).then(setMessages).catch(() => setMessages([]));
          } else {
            createChat().then((chat) => {
              setSavedChats([chat]);
              setActiveChatId(chat.id);
              setMessages([]);
            });
          }
        }
        return remaining;
      });
    } catch { setInputError("Could not delete conversation."); }
  }, [activeChatId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const fetchDocCount = useCallback(async () => {
    try {
      const count = await getDocumentCount(activeChatId);
      setDocCount(count);
      setIsBackendConnected(true);
    } catch (err) {
      setDocCount(0);
      setIsBackendConnected(false);
    }
  }, [activeChatId]);

  useEffect(() => {
    fetchDocCount();
    const interval = setInterval(fetchDocCount, 15000);
    return () => clearInterval(interval);
  }, [fetchDocCount]);

  const handleUploadSuccess = useCallback(() => {
    fetchDocCount();
  }, [fetchDocCount]);

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setInputError("");
  }, []);

  const handleSend = useCallback(
    async (textToSend) => {
      const query = (textToSend || inputValue).trim();
      if (!query) {
        setInputError("Please enter a question.");
        return;
      }
      if (query.length > 1000) {
        setInputError("Question is too long (max 1000 characters).");
        return;
      }

      setInputError("");
      setInputValue("");
      setIsLoading(true);

      const history = messages.slice(-8).map(({ role, content }) => ({ role, content }));
      const nextUserMessage = { role: "user", content: query };
      setMessages((prev) => [...prev, nextUserMessage]);

      try {
        const result = await queryDocument(query, history, activeChatId);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: result.answer,
            sources: result.sources || [],
          },
        ]);
        setIsBackendConnected(true);
      } catch (err) {
        let msg = err.message || "An error occurred";
        if (msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
          msg = "Cannot connect to the backend server. Is it running on port 8001?";
          setIsBackendConnected(false);
        }
        if (err.message === "Unauthorized") {
          handleLogout();
          return;
        }
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: msg,
            sources: [],
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [inputValue, messages, activeChatId, handleLogout]
  );

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleSelectSuggestion = useCallback(
    (suggestionText) => {
      setInputValue(suggestionText);
      textareaRef.current?.focus();
    },
    []
  );

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="relative h-screen bg-[#0B0F19] text-slate-100 flex overflow-hidden selection:bg-indigo-500/30">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <Sidebar
        chats={savedChats}
        activeChatId={activeChatId}
        onSelectChat={selectChat}
        onNewChat={handleCreateChat}
        onDeleteChat={handleDeleteChat}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Bar */}
        <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4 border-b border-slate-800/80 bg-[#0B0F19]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-slate-200">
                {savedChats.find((c) => c.id === activeChatId)?.messages[0]?.content?.slice(0, 40) || "New chat"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <div className={`w-2 h-2 rounded-full ${isBackendConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
              <span className="text-slate-300 font-medium hidden sm:inline">
                {isBackendConnected ? "ChromaDB Connected" : "Backend Offline"}
              </span>
              {docCount !== null && (
                <span className="ml-1 pl-2 border-l border-slate-700 text-indigo-400 font-semibold">
                  {docCount} {docCount === 1 ? "chunk" : "chunks"}
                </span>
              )}
            </div>

            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                title="Clear conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-rose-900/40 border border-slate-800 text-slate-400 hover:text-rose-300 text-xs transition-colors"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/60 text-xs text-slate-300 border border-slate-700/50">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline">{user.username}</span>
            </div>
          </div>
        </header>

        {/* Chat Thread */}
        <div className="flex-1 flex flex-col min-h-0">
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            onSelectSuggestion={handleSelectSuggestion}
          />
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800/80 bg-[#0B0F19]/80 backdrop-blur-md">
          <div className="relative max-w-3xl mx-auto">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (inputError) setInputError("");
              }}
              onKeyDown={handleKeyPress}
              placeholder={
                docCount === 0 || !docCount
                  ? "Upload a PDF or DOCX file to this chat first..."
                  : "Ask a question about your uploaded documents (Enter to send)..."
              }
              disabled={isLoading}
              rows={2}
              maxLength={1000}
              className="w-full glass-input text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none resize-none transition-all disabled:opacity-50 disabled:cursor-not-allowed pr-24"
            />

            <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => uploadBoxRef.current?.openFilePicker()}
                disabled={isLoading}
                className="p-2 rounded-lg border-slate-600 bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Upload PDF or DOCX"
                aria-label="Upload PDF or DOCX"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !inputValue.trim()}
                className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-500/20"
                title="Send Question"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 px-1 text-[11px] max-w-3xl mx-auto">
            {inputError ? (
              <p className="text-rose-400 font-medium">{inputError}</p>
            ) : (
              <p className="text-slate-500">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">Shift+Enter</kbd> for newline
              </p>
            )}
            <span className="text-slate-500 font-mono">
              {inputValue.length}/1000
            </span>
          </div>
        </div>
      </main>

      {/* Hidden UploadBox */}
      <div className="fixed -left-[10000px] top-0 w-px h-px overflow-hidden opacity-0" aria-hidden="true">
        <UploadBox ref={uploadBoxRef} onUploadSuccess={handleUploadSuccess} chatId={activeChatId} />
      </div>
    </div>
  );
}
