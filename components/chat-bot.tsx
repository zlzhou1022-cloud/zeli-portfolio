"use client";

import { useState, useEffect, useRef } from "react";

type Message = {
  role: string;
  content: string;
  timestamp?: string;
};

function formatTs(ts?: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const HH = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${mm}/${dd} ${HH}:${min}:${ss}`;
}

export function ChatBot({ isQuotaFull }: { isQuotaFull: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionBlocked, setSessionBlocked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. 初始化聊天与持久化
  useEffect(() => {
    const saved = localStorage.getItem("chat_history");
    const savedId = localStorage.getItem("chat_session_id");

    const timer = setTimeout(() => {
      if (saved && savedId) {
        setMessages(JSON.parse(saved));
        setChatId(savedId);
      } else {
        const newId = crypto.randomUUID();
        const greeting = "你好！我是小灵，这个网站的 AI 助手。有什么关于网站或作者 Zeli 的问题，欢迎随时提问。\n请注意：AI 生成的回答仅供参考，内容可能存在错误。\n\nこんにちは！私はレイ、このサイトの AI アシスタントです。サイトや作者の Zeli についてご質問があれば、お気軽にどうぞ。\nAI の回答は参考情報としてご利用ください。内容の正確性を保証するものではありません。\n\nHello! I'm Ling, the AI assistant for this site. Feel free to ask me anything about the site or its author, Zeli.\nPlease note: AI-generated responses are for reference only and may not always be accurate.";
        const now = new Date().toISOString();
        setMessages([{ role: "assistant", content: greeting, timestamp: now }]);
        setChatId(newId);
        localStorage.setItem("chat_session_id", newId);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // 2. 自动滚动到底部
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    if (messages.length > 0) {
      localStorage.setItem("chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  if (isQuotaFull) return null;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const now = new Date().toISOString();
    const userMsg: Message = { role: "user", content: input, timestamp: now };
    const newMessages = [...messages, userMsg];

    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: newMessages,
          chatId: chatId,
        }),
      });

      if (res.ok) {
        const aiMsg: Message = await res.json();
        const fullHistory = [...newMessages, aiMsg];
        setMessages(fullHistory);
        localStorage.setItem("chat_history", JSON.stringify(fullHistory));
      } else {
        const errorText = await res.text();
        if (errorText === "session_quota_full") {
          setSessionBlocked(true);
          const errMsg: Message = { role: "assistant", content: "This session has reached its message limit. Please refresh the page to start a new session.", timestamp: new Date().toISOString() };
          setMessages([...newMessages, errMsg]);
        } else {
          const errMsg: Message = { role: "assistant", content: `(System: ${errorText})`, timestamp: new Date().toISOString() };
          setMessages([...newMessages, errMsg]);
        }
      }
    } catch {
      const errMsg: Message = { role: "assistant", content: "Connection failed. Please try again later.", timestamp: new Date().toISOString() };
      setMessages([...newMessages, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-96 h-[500px] bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 shadow-2xl">
          <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center">
            <div>
              <span className="text-sm font-serif text-stone-900 dark:text-stone-100">AI Assistant</span>
              <p className="text-xs text-stone-500 mt-0.5 font-light">Powered by Groq</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors text-lg leading-none cursor-pointer">×</button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {messages.map((m, i) => {
              const isUser = m.role === "user";
              const ts = formatTs(m.timestamp);
              return (
                <div key={i} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  {ts && (
                    <span className="text-[9px] tracking-wider uppercase text-stone-400 mb-2 px-1">{ts}</span>
                  )}
                  <div className={`max-w-[85%] p-4 text-sm whitespace-pre-wrap leading-relaxed font-light ${
                    isUser
                      ? "bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 border border-stone-900 dark:border-stone-100"
                      : "bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-stone-800"
                  }`}>
                    {m.content}
                  </div>
                </div>
              );
            })}
            {isLoading && <div className="text-xs text-stone-400 animate-pulse font-light italic">Thinking...</div>}
            <div ref={scrollRef} />
          </div>

          <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={sessionBlocked ? "Session limit reached." : "Type a message..."}
              disabled={sessionBlocked}
              className="flex-1 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-4 py-2.5 text-sm outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-light"
            />
            <button 
              onClick={handleSend} 
              disabled={sessionBlocked} 
              className="bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-4 py-2.5 text-xs tracking-wider uppercase font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 border border-stone-900 dark:border-stone-100 flex items-center justify-center text-xs tracking-wider uppercase font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-all cursor-pointer shadow-lg"
      >
        {isOpen ? "×" : "Chat"}
      </button>
    </div>
  );
}
