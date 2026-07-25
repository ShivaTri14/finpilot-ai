"use client";

import { Bot, User, Copy, Check } from "lucide-react";
import { useState } from "react";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  userName?: string;
}

export default function ChatBubble({ role, content, timestamp, userName }: ChatBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isAssistant = role === "assistant";

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${isAssistant ? "justify-start" : "justify-end"} group`}>
      {isAssistant && (
        <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center text-slate-950 font-bold shrink-0 shadow-lg shadow-purple-500/20">
          <Bot className="h-5 w-5 stroke-[2.5]" />
        </div>
      )}

      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 sm:p-5 space-y-2 relative shadow-lg ${
          isAssistant
            ? "bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-sm"
            : "bg-emerald-500 text-slate-950 rounded-tr-sm font-medium"
        }`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-800/40 pb-1.5 text-[10px]">
          <span className={`font-bold uppercase tracking-wider ${isAssistant ? "text-purple-400" : "text-slate-950 opacity-80"}`}>
            {isAssistant ? "FinPilot AI Coach" : userName || "You"}
          </span>
          <div className="flex items-center gap-2">
            {timestamp && <span className={isAssistant ? "text-slate-500" : "text-slate-900 opacity-70"}>{timestamp}</span>}
            {isAssistant && (
              <button
                onClick={handleCopy}
                className="text-slate-400 hover:text-white transition-colors"
                title="Copy response text"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
            )}
          </div>
        </div>

        <div className={`text-xs leading-relaxed whitespace-pre-line ${isAssistant ? "text-slate-200" : "text-slate-950 font-medium"}`}>
          {content}
        </div>
      </div>

      {!isAssistant && (
        <div className="h-9 w-9 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold shrink-0 text-xs">
          {userName ? userName[0].toUpperCase() : "U"}
        </div>
      )}
    </div>
  );
}
