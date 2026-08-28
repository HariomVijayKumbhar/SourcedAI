"use client";

import { useState } from "react";
import SourceCard from "./SourceCard";
import { Bot, User, Sparkles, Copy, Check, MessageSquare, ShieldCheck, Database } from "lucide-react";

export default function ChatWindow({ messages, isLoading, onSelectSuggestion }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleCopyMessage = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const suggestions = [
    "What are the main key takeaways from the document?",
    "Summarize the key findings or methodology.",
    "What specific conclusions or recommendations are mentioned?",
  ];

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
            <Sparkles className="w-8 h-8 text-indigo-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>

        <h3 className="text-base font-semibold text-slate-200">Knowledge Assistant Ready</h3>
        <p className="text-xs text-slate-400 mt-1.5 max-w-md leading-relaxed">
          Ask questions against your indexed documents. Responses are strictly grounded in retrieved vector context with verified citations.
        </p>

        {onSelectSuggestion && (
          <div className="mt-6 w-full max-w-md space-y-2">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider text-left">Suggested Questions</p>
            <div className="flex flex-col gap-1.5 text-left">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectSuggestion(s)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 hover:border-indigo-500/40 border border-slate-700/50 text-xs text-slate-300 transition-all text-left group"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="truncate">{s}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
      {messages.map((msg, idx) => {
        const isUser = msg.role === "user";
        return (
          <div
            key={idx}
            className={`flex gap-3 sm:gap-4 ${isUser ? "justify-end" : "justify-start"} animate-in fade-in duration-200`}
          >
            {!isUser && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-500/20 border border-indigo-400/30 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-[88%] sm:max-w-[80%] space-y-2.5 ${isUser ? "items-end" : "items-start"}`}>
              <div
                className={`relative group p-4 rounded-2xl text-sm leading-relaxed ${
                  isUser
                    ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-none shadow-md shadow-indigo-900/20 border border-indigo-500/30"
                    : "bg-slate-800/80 text-slate-100 rounded-bl-none border border-slate-700/70 shadow-sm"
                }`}
              >
                <p className="whitespace-pre-wrap font-normal">{msg.content}</p>

                {!isUser && (
                  <button
                    onClick={() => handleCopyMessage(msg.content, idx)}
                    className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-slate-700/70 hover:bg-slate-600 text-slate-300 hover:text-white text-xs flex items-center gap-1"
                    title="Copy response"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>

              {!isUser && msg.sources && msg.sources.length > 0 && (
                <div className="pt-1">
                  <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-semibold text-slate-400 tracking-wide uppercase">
                    <Database className="w-3 h-3 text-indigo-400" />
                    <span>Cited Sources ({msg.sources.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((src, j) => (
                      <SourceCard key={j} source={src} />
                    ))}
                  </div>
                </div>
              )}

              {!isUser && Array.isArray(msg.sources) && msg.sources.length === 0 && (
                <p className="text-[11px] text-slate-500 italic pl-1">
                  No direct sources referenced for this query.
                </p>
              )}
            </div>

            {isUser && (
              <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center text-slate-200 shrink-0 border border-slate-600 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        );
      })}

      {isLoading && (
        <div className="flex gap-3 sm:gap-4 justify-start animate-in fade-in">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-500/20 border border-indigo-400/30">
            <Bot className="w-4 h-4" />
          </div>
          <div className="bg-slate-800/80 rounded-2xl rounded-bl-none p-4 border border-slate-700/70 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse delay-150"></span>
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse delay-300"></span>
            </div>
            <span className="text-xs font-medium text-slate-400">
              Retrieving context & generating verified answer...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
