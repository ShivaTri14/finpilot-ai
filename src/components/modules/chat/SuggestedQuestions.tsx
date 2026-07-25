"use client";

import { Sparkles } from "lucide-react";

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

export default function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  const questions = [
    "Why did the AI recommend my current asset allocation?",
    "Am I on track to meet my financial goals?",
    "Where am I spending the most money this month?",
    "How does a SIP mutual fund compound wealth over time?",
    "How much emergency fund should I keep?",
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
        <Sparkles className="h-3.5 w-3.5 text-purple-400" />
        <span>Suggested Starter Questions:</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {questions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(q)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 hover:bg-slate-800/60 text-slate-300 hover:text-white text-xs whitespace-nowrap transition-all shadow-sm shrink-0"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
