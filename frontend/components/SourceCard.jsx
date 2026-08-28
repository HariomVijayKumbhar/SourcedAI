"use client";

import { FileText, Bookmark, Check, Copy } from "lucide-react";
import { useState } from "react";

export default function SourceCard({ source }) {
  const [copied, setCopied] = useState(false);

  if (!source) return null;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${source.source_document} (Chunk ${source.chunk_index + 1})`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative inline-flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700/70 hover:border-indigo-500/50 shadow-sm transition-all duration-200">
      <div className="flex items-center justify-center w-5 h-5 rounded bg-indigo-500/10 text-indigo-400">
        <FileText className="w-3.5 h-3.5" />
      </div>

      <div className="flex items-center gap-1.5">
        <span className="font-medium text-slate-300 truncate max-w-[140px] sm:max-w-[200px]" title={source.source_document}>
          {source.source_document}
        </span>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
          Chunk {source.chunk_index + 1}{source.total_chunks > 1 ? `/${source.total_chunks}` : ""}
        </span>
      </div>

      {source.distance !== undefined && source.distance > 0 && (
        <span className="hidden sm:inline-block text-[10px] text-slate-400 font-mono" title="Vector distance score">
          (dist: {source.distance})
        </span>
      )}

      <button
        onClick={handleCopy}
        title="Copy citation"
        className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-slate-400 hover:text-slate-200 p-0.5 rounded"
      >
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}
