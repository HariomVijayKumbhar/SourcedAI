"use client";

import { useState } from "react";
import { registerUser } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Sparkles, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const result = await registerUser(username, password);
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
      router.push("/");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex items-center justify-center p-6">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
      </div>

      <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-100">SourceAI</h1>
        </div>
        <p className="text-sm text-slate-400 mb-6">Create an account to get started.</p>

        <label className="block text-xs font-medium text-slate-300 mb-2">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => { setUsername(e.target.value); if (error) setError(""); }}
          placeholder="Choose a username"
          autoFocus
          disabled={isLoading}
          className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50 mb-3"
        />

        <label className="block text-xs font-medium text-slate-300 mb-2">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
          placeholder="At least 6 characters"
          disabled={isLoading}
          className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50 mb-4"
        />

        {error && (
          <div className="mb-3 flex items-start gap-2 text-rose-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-500/20">
          {isLoading ? "Creating account..." : "Create Account"}
        </button>

        <p className="mt-4 text-center text-xs text-slate-400">
          Already have an account? <a href="/login" className="text-indigo-400 hover:text-indigo-300">Sign in</a>
        </p>
      </form>
    </div>
  );
}
