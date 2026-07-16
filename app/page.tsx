'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Key, ArrowRight, Sparkles, Command, MessageSquarePlus } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || isLoading) return;

    if (!apiKey) {
      setShowApiModal(true);
      return;
    }

    const newMessages: Message[] = [...messages, { role: 'user', content: textToSend }];
    setMessages(newMessages);
    if (!customPrompt) setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, apiKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan');
      }

      setMessages([...newMessages, { role: 'assistant', content: data.message }]);
    } catch (err: any) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `[System Error]: ${err.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-[#f4f4f5] font-sans overflow-hidden antialiased selection:bg-zinc-800 selection:text-zinc-100">
      
      {/* SIDEBAR - Apple Floating Glass Panel */}
      <aside className="w-72 border-r border-zinc-800/60 bg-[#09090b]/80 backdrop-blur-xl p-5 flex flex-col justify-between hidden md:flex">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-100 animate-pulse" />
              <span className="font-medium text-sm tracking-tight text-zinc-200">AURA AI</span>
            </div>
            <button 
              onClick={resetChat}
              className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="New Chat"
            >
              <MessageSquarePlus className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Stats / Status */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono tracking-wider uppercase text-zinc-500 font-semibold px-1">
              Engine Status
            </span>
            <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 text-xs text-zinc-400 flex items-center justify-between">
              <span>Model</span>
              <span className="font-mono text-[11px] text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded-md">LLaMA 3.3 70B</span>
            </div>
          </div>
        </div>

        {/* Bottom Settings */}
        <div className="pt-4 border-t border-zinc-800/60">
          <button
            onClick={() => setShowApiModal(true)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/40 transition-all text-xs text-zinc-300"
          >
            <div className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-zinc-400" />
              <span>API Key</span>
            </div>
            <span className="font-mono text-[10px] text-zinc-500">
              {apiKey ? '•••' + apiKey.slice(-4) : 'Not Set'}
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN CANVAS */}
      <main className="flex-1 flex flex-col relative bg-[#09090b]">
        
        {/* CHAT VIEW / HERO */}
        <div className="flex-1 overflow-y-auto px-4 py-8 md:px-12 flex flex-col items-center">
          <div className="w-full max-w-2xl flex-1 flex flex-col">
            
            {messages.length === 0 ? (
              /* Awwwards Minimal Hero */
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="my-auto py-12 space-y-8"
              >
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 font-medium">
                    <Sparkles className="w-3 h-3 text-zinc-200" />
                    <span>Awwwards-grade Intelligence</span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-normal tracking-tight text-zinc-100 leading-[1.15]">
                    Thought rendered <br />
                    <span className="text-zinc-500">into code & execution.</span>
                  </h1>
                </div>

                {/* Apple Style Preset Cards */}
                <div className="grid grid-cols-1 gap-2.5 pt-4">
                  {[
                    { title: "Refactor Architecture", desc: "Clean code & modular design patterns" },
                    { title: "Debug Complex Issues", desc: "Isolate bugs with root-cause analysis" },
                    { title: "Draft React Components", desc: "Modern UI built with Tailwind & TypeScript" },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(`${preset.title}: ${preset.desc}`)}
                      className="group flex items-center justify-between p-4 rounded-2xl bg-zinc-900/30 hover:bg-zinc-900/80 border border-zinc-800/40 hover:border-zinc-700/60 transition-all text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">{preset.title}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{preset.desc}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-200 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* Message Stream */
              <div className="space-y-6 pb-36 pt-4">
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-1.5"
                  >
                    <div className="text-[11px] font-mono text-zinc-500 tracking-wider uppercase">
                      {msg.role === 'user' ? 'You' : 'Aura'}
                    </div>
                    <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user' ? 'text-zinc-300 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50' : 'text-zinc-100 pl-1'
                    }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
                    <div className="text-[11px] font-mono text-zinc-500 tracking-wider uppercase">Aura</div>
                    <div className="text-sm text-zinc-500 animate-pulse flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-ping" />
                      Computing response...
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

          </div>
        </div>

        {/* INPUT DOCK - Floating Apple Capsule */}
        <div className="absolute bottom-6 left-0 right-0 px-4 flex justify-center pointer-events-none">
          <div className="w-full max-w-2xl pointer-events-auto">
            <div className="relative flex items-center bg-[#121215]/90 backdrop-blur-2xl border border-zinc-800/80 rounded-2xl p-2 shadow-2xl shadow-black/80 focus-within:border-zinc-600 transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask or command anything..."
                rows={1}
                className="w-full bg-transparent px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none max-h-32"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-zinc-100 text-zinc-950 hover:bg-white disabled:opacity-30 disabled:hover:bg-zinc-100 transition-all"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* API KEY MODAL */}
      <AnimatePresence>
        {showApiModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl"
            >
              <div className="space-y-1">
                <h3 className="text-base font-medium text-zinc-100">Groq API Key Required</h3>
                <p className="text-xs text-zinc-400">Masukkan API key kamu untuk mengaktifkan AI engine.</p>
              </div>

              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-zinc-600"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setShowApiModal(false)}
                  className="w-full py-2 rounded-xl bg-zinc-100 text-zinc-950 text-xs font-medium hover:bg-white transition-colors"
                >
                  Save & Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}