"use client";

import { useSession } from "next-auth/react";
import ChatWindow from "@/components/modules/chat/ChatWindow";
import { MessageSquareText, ShieldCheck } from "lucide-react";

export default function ChatPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Financial Explorer";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Financial Chatbot</h1>
          <p className="text-sm text-slate-400 mt-1">
            Context-aware conversational financial coaching referencing your real-time goals, surplus, & SIP investment plan.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="h-4 w-4" />
          <span>Context Ingestion Active</span>
        </div>
      </div>

      <ChatWindow userName={userName} />
    </div>
  );
}
