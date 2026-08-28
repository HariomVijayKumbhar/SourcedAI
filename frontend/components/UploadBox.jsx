"use client";

import { useState, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { uploadDocument } from "@/lib/api";
import { UploadCloud, CheckCircle2, AlertCircle, Sparkles, X, FileCheck, FileSearch } from "lucide-react";

const UploadBox = forwardRef(function UploadBox({ onUploadSuccess, chatId }, ref) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [extractStatus, setExtractStatus] = useState(null);
  const fileInputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    openFilePicker: () => {
      if (!isUploading) fileInputRef.current?.click();
    },
  }), [isUploading]);

  const handleFileSelect = useCallback(
    async (file) => {
      if (!file) return;

      setError("");
      setSuccess("");
      setCurrentFile(file);
      setUploadStatus(null);
      setExtractStatus(null);

      if (!file.name.toLowerCase().match(/\.(pdf|docx)$/)) {
        setError("Only PDF and DOCX documents are supported.");
        setCurrentFile(null);
        return;
      }

      const MAX_SIZE_MB = 10;
      const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
      if (file.size > MAX_SIZE_BYTES) {
        const actualSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        setError(`File is ${actualSizeMB} MB — exceeds the ${MAX_SIZE_MB} MB limit. Please upload a smaller document.`);
        setCurrentFile(null);
        return;
      }

      setIsUploading(true);
      setUploadStatus("loading");
      setExtractStatus("pending");

      try {
        const result = await uploadDocument(file, chatId);
        setUploadStatus("success");
        setExtractStatus("success");
        setSuccess(result.message || `Successfully indexed ${result.num_chunks} chunks from ${file.name}`);
        if (onUploadSuccess) onUploadSuccess(result);
      } catch (err) {
        setUploadStatus("error");
        setExtractStatus("error");
        let msg = err.message || "Failed to upload and process document.";
        if (msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
          msg = "Cannot connect to the backend server. Is it running on port 8001?";
        } else if (msg.toLowerCase().includes("no readable text") || msg.toLowerCase().includes("extract")) {
          setUploadStatus("success");
          setExtractStatus("error");
          msg = "File uploaded successfully, but could not extract text. The document may be scanned images, encrypted, or contain no readable text.";
        }
        setError(msg);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [onUploadSuccess, chatId]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleInputChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleClick = useCallback(() => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  }, [isUploading]);

  const renderStatusIcon = (status) => {
    if (status === "loading") return <div className="w-4 h-4 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />;
    if (status === "success") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (status === "error") return <AlertCircle className="w-4 h-4 text-rose-400" />;
    return <div className="w-4 h-4 rounded-full border-2 border-slate-600" />;
  };

  return (
    <div className="glass-card rounded-2xl p-6 transition-all duration-300 shadow-xl border border-slate-800/80">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <UploadCloud className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">Upload Knowledge Source</h2>
            <p className="text-xs text-slate-400">PDF or DOCX documents up to 10MB</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">PDF</span>
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">DOCX</span>
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`group relative rounded-xl border-2 border-dashed p-7 text-center cursor-pointer transition-all duration-300 ${
          isDragging
            ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.2)]"
            : "border-slate-700/80 hover:border-indigo-500/50 bg-slate-900/40 hover:bg-slate-900/70"
        } ${isUploading ? "pointer-events-none opacity-80" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleInputChange}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-2 space-y-3">
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <Sparkles className="w-5 h-5 text-indigo-400 absolute animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-200">
                Processing {currentFile?.name ? `"${currentFile.name}"` : "document"}...
              </p>
              <p className="text-xs text-slate-400">Extracting text and generating vector embeddings</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-b from-indigo-500/10 to-violet-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform duration-300 border border-indigo-500/20 shadow-inner">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">
                {isDragging ? "Drop your document here..." : "Click to select or drag and drop"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Your file will be chunked, vectorized with Sentence Transformers, and stored in ChromaDB
              </p>
            </div>
          </div>
        )}
      </div>

      {(uploadStatus || extractStatus) && !isUploading && (
        <div className="mt-4 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-2.5">
          <div className="flex items-center gap-2.5">
            {renderStatusIcon(uploadStatus)}
            <div className="flex items-center gap-2">
              <FileCheck className="w-3.5 h-3.5 text-slate-400" />
              <span className={`text-xs ${uploadStatus === "success" ? "text-emerald-300" : uploadStatus === "error" ? "text-rose-300" : "text-slate-300"}`}>
                {uploadStatus === "success" && "File uploaded successfully"}
                {uploadStatus === "error" && "File upload failed"}
                {uploadStatus === "loading" && "Uploading file..."}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {renderStatusIcon(extractStatus)}
            <div className="flex items-center gap-2">
              <FileSearch className="w-3.5 h-3.5 text-slate-400" />
              <span className={`text-xs ${extractStatus === "success" ? "text-emerald-300" : extractStatus === "error" ? "text-rose-300" : "text-slate-300"}`}>
                {extractStatus === "success" && "Text extracted successfully"}
                {extractStatus === "error" && "Text extraction failed"}
                {extractStatus === "loading" && "Extracting text..."}
                {extractStatus === "pending" && "Waiting for upload..."}
              </span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2.5 p-3.5 bg-rose-950/40 text-rose-300 rounded-xl border border-rose-800/40 text-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => { setError(""); setUploadStatus(null); setExtractStatus(null); }} className="text-rose-400 hover:text-rose-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {success && (
        <div className="mt-4 flex items-start gap-2.5 p-3.5 bg-emerald-950/40 text-emerald-300 rounded-xl border border-emerald-800/40 text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span className="flex-1">{success}</span>
          <button onClick={() => { setSuccess(""); setUploadStatus(null); setExtractStatus(null); }} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
});

export default UploadBox;
