"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";

// Markdown 渲染器懒加载，只进聊天 chunk，不拖慢首屏（规格 §8）。
const ChatMarkdown = dynamic(() => import("./chat-markdown"), { ssr: false });

type Message = {
  role: string;
  content: string;
  timestamp?: string;
  navPath?: string;
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
  const locale = useLocale();
  const t = useTranslations("ChatBot");
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionBlocked, setSessionBlocked] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = (t.raw("suggestions") as string[]) ?? [];
  const hasUserMsg = messages.some((m) => m.role === "user");

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const makeGreeting = (): Message => ({
    role: "assistant",
    content: t("greeting"),
    timestamp: new Date().toISOString(),
  });

  // 清空会话：清 localStorage 并生成新 chatId（开始真正的新会话）。
  const handleClear = () => {
    abortRef.current?.abort();
    const newId = crypto.randomUUID();
    localStorage.removeItem("chat_history");
    localStorage.setItem("chat_session_id", newId);
    setChatId(newId);
    setMessages([makeGreeting()]);
    setSessionBlocked(false);
    setInput("");
    setIsLoading(false);
  };

  const handleCopy = async (idx: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 1500);
    } catch {
      /* 剪贴板不可用时静默失败 */
    }
  };

  // 开场白本地化：历史第一条 assistant 消息必是开场白（其余 assistant 消息都跟在用户消息后）。
  // localStorage 的历史跨语言共用，若不处理，访客在中文站留下的开场白会被带到日/英站
  // （旧版三语堆叠开场白同理）。加载与语言切换时都把开场白槽位换成当前语言版本；
  // 真实问答历史不改动。
  const greetingText = t("greeting");
  const localizeGreeting = (list: Message[]): Message[] => {
    if (list.length === 0 || list[0].role !== "assistant" || list[0].content === greetingText) {
      return list;
    }
    const copy = [...list];
    copy[0] = { ...copy[0], content: greetingText };
    return copy;
  };

  // 语言切换时同步开场白语言（本站语言切换是整页刷新，初始化已处理；
  // 这里再兜一层无刷新的语言变化。写法与初始化一致，用 setTimeout 异步执行）。
  useEffect(() => {
    const id = setTimeout(() => {
      setMessages((prev) => localizeGreeting(prev));
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greetingText]);

  // 1. 初始化聊天与持久化
  useEffect(() => {
    const saved = localStorage.getItem("chat_history");
    const savedId = localStorage.getItem("chat_session_id");

    const timer = setTimeout(() => {
      if (saved && savedId) {
        try {
          setMessages(localizeGreeting(JSON.parse(saved)));
        } catch {
          setMessages([makeGreeting()]);
        }
        setChatId(savedId);
      } else {
        const newId = crypto.randomUUID();
        setMessages([makeGreeting()]);
        setChatId(newId);
        localStorage.setItem("chat_session_id", newId);
      }
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. 自动滚动到底部 + 持久化
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    if (messages.length > 0) {
      localStorage.setItem("chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  // 吉祥物气泡里的「和我聊聊」通过自定义事件打开聊天窗
  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener("ling:open-chat", open);
    return () => window.removeEventListener("ling:open-chat", open);
  }, []);

  if (isQuotaFull) return null;

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    const now = new Date().toISOString();
    const userMsg: Message = { role: "user", content: text, timestamp: now };
    const newMessages = [...messages, userMsg];

    setMessages(newMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: newMessages.map(({ role, content, timestamp }) => ({ role, content, timestamp })),
          chatId: chatId,
          locale: locale,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errorText = res.body ? await res.text() : "Connection failed";
        if (errorText === "session_quota_full") {
          setSessionBlocked(true);
          const errMsg: Message = { role: "assistant", content: t("sessionFull"), timestamp: new Date().toISOString() };
          setMessages([...newMessages, errMsg]);
        } else {
          // 不把服务端原始报错（如限流英文详情）原样展示给访客，统一用本地化友好文案。
          const errMsg: Message = { role: "assistant", content: t("connectionError"), timestamp: new Date().toISOString() };
          setMessages([...newMessages, errMsg]);
        }
        return;
      }

      // 流式读取（AI SDK UI message stream）：逐行解析 data: JSON，
      // 累积 text-delta；tool-output-available 里的 navigate_to 结果渲染为跳转卡片（PR-D）。
      const aiMsg: Message = { role: "assistant", content: "", timestamp: new Date().toISOString() };
      setMessages([...newMessages, aiMsg]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      let navPath = "";
      let streamError = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const tline = line.trim();
          if (!tline.startsWith("data:")) continue;
          const payload = tline.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const obj = JSON.parse(payload);
            if (obj.type === "text-delta" && typeof obj.delta === "string") {
              acc += obj.delta;
            } else if (obj.type === "tool-output-available" && obj.output && typeof obj.output === "object") {
              const out = obj.output as { path?: string };
              if (typeof out.path === "string" && out.path.startsWith("/")) {
                navPath = out.path;
              }
            } else if (obj.type === "error") {
              streamError = String(obj.errorText ?? "stream error");
              continue;
            } else {
              continue;
            }
            const snapshot = acc;
            const snapshotNav = navPath;
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { ...aiMsg, content: snapshot, navPath: snapshotNav || undefined };
              return copy;
            });
          } catch {
            /* 忽略无法解析的行 */
          }
        }
      }
      if (streamError && !acc) {
        // 流内错误（如 Groq 限流）同样不外露原始报错，统一用本地化友好文案。
        const errMsg: Message = { role: "assistant", content: t("connectionError"), timestamp: new Date().toISOString() };
        setMessages([...newMessages, errMsg]);
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        // 访客点了停止：已生成的部分留在界面上（服务端不会落库这半条）
      } else {
        const errMsg: Message = { role: "assistant", content: t("connectionError"), timestamp: new Date().toISOString() };
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant" && last.content === "") {
            return [...newMessages, errMsg];
          }
          return [...prev, errMsg];
        });
      }
    } finally {
      abortRef.current = null;
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-[min(24rem,calc(100vw-2rem))] h-[min(500px,calc(100dvh-8rem))] bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 shadow-2xl">
          <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center">
            <div>
              <span className="text-sm font-serif text-stone-900 dark:text-stone-100">{t("title")}</span>
              <p className="text-xs text-stone-500 mt-0.5 font-light">Powered by Groq</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleClear} className="text-[11px] tracking-wider uppercase text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer">
                {t("clear")}
              </button>
              <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors text-lg leading-none cursor-pointer">×</button>
            </div>
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
                  <div className={`max-w-[85%] p-4 text-sm leading-relaxed font-light ${
                    isUser
                      ? "bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 border border-stone-900 dark:border-stone-100 whitespace-pre-wrap"
                      : "bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-stone-800"
                  }`}>
                    {isUser ? (
                      m.content
                    ) : m.content ? (
                      <ChatMarkdown content={m.content} />
                    ) : (
                      ""
                    )}
                    {m.navPath && (
                      <a
                        href={m.navPath}
                        className="mt-3 flex items-center justify-between gap-2 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-xs tracking-wider uppercase font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      >
                        <span>{t("openPage")}</span>
                        <span aria-hidden>→</span>
                      </a>
                    )}
                  </div>
                  {m.content && (
                    <button
                      onClick={() => handleCopy(i, m.content)}
                      className="mt-1.5 px-1 text-[10px] tracking-wider uppercase text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
                    >
                      {copiedIdx === i ? t("copied") : t("copy")}
                    </button>
                  )}
                </div>
              );
            })}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && <div className="text-xs text-stone-400 animate-pulse font-light italic">{t("thinking")}</div>}
            <div ref={scrollRef} />
          </div>

          {!hasUserMsg && !isLoading && suggestions.length > 0 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-xs border border-stone-300 dark:border-stone-700 px-3 py-1.5 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer font-light"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <p className="px-4 pb-2 text-[10px] text-stone-400 font-light">{t("disclaimer")}</p>

          <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder={sessionBlocked ? t("sessionFull") : t("placeholder")}
              disabled={sessionBlocked}
              className="flex-1 resize-none bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-4 py-2.5 text-base outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-light max-h-[120px] overflow-y-auto"
            />
            {isLoading ? (
              <button
                onClick={handleStop}
                className="bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 px-4 py-2.5 text-xs tracking-wider uppercase font-medium cursor-pointer hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors shrink-0"
              >
                {t("stop")}
              </button>
            ) : (
              <button
                onClick={() => handleSend()}
                disabled={sessionBlocked}
                className="bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-4 py-2.5 text-xs tracking-wider uppercase font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors shrink-0"
              >
                {t("send")}
              </button>
            )}
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
