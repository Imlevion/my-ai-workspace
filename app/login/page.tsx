"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        mode === "login" ? "/api/auth/login" : "/api/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "login" ? { email, password } : { email, password, name }
          ),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      router.replace("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <motion.div
        className="w-full max-w-[400px]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-[1.5rem] bg-[var(--surface-container-lowest)] shadow-[0_12px_36px_rgba(0,0,0,0.1)] border border-[var(--outline-variant)]/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/construct-icon.svg"
              alt="Construct"
              className="h-16 w-16"
              draggable={false}
            />
          </div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--on-surface)]">
            Construct
          </h1>
          <p className="mt-1.5 text-[14px] text-[var(--on-surface-variant)]">
            {mode === "login"
              ? "Sign in to your workspace"
              : "Create an account to keep your work"}
          </p>
        </div>

        <form onSubmit={submit} className="login-card">
          <AnimatePresence mode="wait" initial={false}>
            {mode === "register" && (
              <motion.div
                key="name"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <label className="label">Name</label>
                <input
                  className="field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  autoComplete="name"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mb-4">
            <label className="label">Email</label>
            <input
              className="field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="mb-5">
            <label className="label">Password</label>
            <input
              className="field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-4 rounded-lg bg-[var(--error-container)] px-3 py-2 text-[12px] text-[var(--error)]"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>

          <p className="mt-5 text-center text-[13px] text-[var(--on-surface-variant)]">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="font-semibold text-[var(--on-surface)] underline-offset-2 hover:underline"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
              }}
            >
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
