"use client";

import { useState } from "react";
import { loginUser, registerUser, saveToken, saveUser } from "@/lib/api";
import { Sparkles, LogIn, UserPlus, AlertCircle } from "lucide-react";

export default function AuthPage({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = isLogin
        ? await loginUser(username, password)
        : await registerUser(username, password);

      saveToken(result.token);
      saveUser(result.user);
      onAuthSuccess(result.user);
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-indigo-500/25 mb-4">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white">SourceAI</h1>
          <p className="text-sm text-slate-400 mt-1">RAG-based knowledge assistant</p>
        </div>

        <div className="glass-card rounded-2xl p-8 shadow-xl border border-slate-800/80">
          <div className="flex items-center gap-2 p-1 bg-slate-900/60 rounded-xl mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                isLogin ? "bg-indigo-500/20 text-indigo-300" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LogIn className="w-4 h-4" />
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                !isLogin ? "bg-indigo-500/20 text-indigo-300" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                className="w-full glass-input text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full glass-input text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                placeholder="Enter password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-950/40 text-rose-300 rounded-xl border border-rose-800/40 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-medium transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
