"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Bot, Loader2, Trash2, RefreshCw, Sparkles } from "lucide-react";
import ChatBubble from "./ChatBubble";
import SuggestedQuestions from "./SuggestedQuestions";

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ChatWindowProps {
  userName?: string;
}

export default function ChatWindow({ userName }: ChatWindowProps) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchChatHistory = async () => {
    setFetchingHistory(true);
    try {
      const res = await fetch("/api/ai/chat");
      const data = await res.json();
      if (res.ok && data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    } finally {
      setFetchingHistory(false);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMessageText = query.trim();
    if (!textToSend) setInput("");

    // Optimistic UI update
    const tempUserMsg: MessageItem = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessageText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessageText }),
      });

      const data = await res.json();

      if (res.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (err) {
      console.error("Chat send error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      const res = await fetch("/api/ai/chat", { method: "DELETE" });
      if (res.ok) {
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to clear chat history:", err);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[700px] backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-purple-500/20">
            <Bot className="h-6 w-6 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>FinPilot Context-Aware Advisor</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </h2>
            <p className="text-xs text-slate-400">
              Live account context: Goals, Expenses & Investment Plan injected
            </p>
          </div>
        </div>

        <button
          onClick={handleClearHistory}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors text-xs flex items-center gap-1.5"
          title="Clear Chat History"
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Clear Chat</span>
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {fetchingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 max-w-md mx-auto">
            <div className="h-14 w-14 rounded-3xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shadow-inner">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Ask your AI Financial Coach anything</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              I have full real-time awareness of your goals, monthly surplus, spending categories, and calculated SIP investment model.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              timestamp={new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              userName={userName}
            />
          ))
        )}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center text-slate-950 font-bold shrink-0">
              <Bot className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
              <span>FinPilot AI is analyzing your live financial context...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Starter Questions & Input Area */}
      <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950/60 space-y-4">
        <SuggestedQuestions onSelect={(q) => handleSend(q)} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            placeholder="Ask about your financial plan, goals, or strategy..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-xs transition-colors"
          />

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-3 rounded-2xl font-semibold text-slate-950 bg-purple-400 hover:bg-purple-300 disabled:opacity-50 transition-all shadow-lg shadow-purple-500/20 shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
