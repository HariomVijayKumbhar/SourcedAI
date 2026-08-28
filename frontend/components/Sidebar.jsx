"use client";

import { Plus, MessageSquare, Trash2, X, Sparkles } from "lucide-react";

export default function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  isOpen,
  onClose,
}) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 flex flex-col bg-[#0B0F19] lg:bg-transparent border-r border-slate-800/80 lg:border-r-0 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-white tracking-tight">SourceAI</span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 hover:text-indigo-200 text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            New chat
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <div className="space-y-1">
            {chats.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No conversations yet</p>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group relative flex items-center rounded-lg transition-colors ${
                    chat.id === activeChatId
                      ? "bg-indigo-500/15 border border-indigo-500/25"
                      : "hover:bg-slate-800/60 border border-transparent"
                  }`}
                >
                  <button
                    onClick={() => {
                      onSelectChat(chat);
                      onClose();
                    }}
                    className="flex-1 flex items-center gap-2.5 px-3 py-2.5 text-left min-w-0"
                  >
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${chat.id === activeChatId ? "text-indigo-400" : "text-slate-500"}`} />
                    <span className={`text-xs truncate ${chat.id === activeChatId ? "text-indigo-200" : "text-slate-400"}`}>
                      {chat.messages[0]?.content?.slice(0, 40) || chat.title || "New chat"}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    className="absolute right-2 p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete conversation"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800/80">
          <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-slate-500">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>RAG Assistant</span>
          </div>
        </div>
      </aside>
    </>
  );
}
