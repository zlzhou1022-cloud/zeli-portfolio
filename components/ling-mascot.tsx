"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// 小灵吉祥物：页面左下角的光团精灵（小灵的「身体」，聊天窗是她的「大脑」）。
// 眼睛跟随指针、身体微倾、随机眨眼；点击冒气泡，可打开聊天窗，
// 也可永久隐藏（记 localStorage）。纯前端、无后端调用、不吃聊天配额。
// 开关：NEXT_PUBLIC_LING_MASCOT_ENABLED=0 时整体不渲染（默认开）。
const MASCOT_ENABLED = process.env.NEXT_PUBLIC_LING_MASCOT_ENABLED !== "0";
const HIDDEN_KEY = "ling_mascot_hidden";
const INVITED_KEY = "ling_mascot_invited";

export function LingMascot() {
  const t = useTranslations("Mascot");
  const lines = (t.raw("lines") as string[]) ?? [];

  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [lineIdx, setLineIdx] = useState(0);
  const [blinking, setBlinking] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const pupilRef = useRef<SVGGElement>(null);
  const pointerRef = useRef<{ x: number; y: number; at: number } | null>(null);
  const wanderRef = useRef<{ x: number; y: number; until: number }>({ x: 0, y: 0, until: 0 });
  const curRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const reducedRef = useRef(false);

  // 挂载后读 localStorage（避免 SSR/水合不一致；setTimeout 写法与 chat-bot 一致，避开 lint 的同步 setState 规则）
  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = setTimeout(() => {
      setHidden(localStorage.getItem(HIDDEN_KEY) === "1");
      setMounted(true);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  // 指针追踪：鼠标移动 / 触摸点按都记下位置与时间
  useEffect(() => {
    if (!mounted || hidden) return;
    const onMove = (e: MouseEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY, at: performance.now() };
    };
    const onTouch = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) pointerRef.current = { x: touch.clientX, y: touch.clientY, at: performance.now() };
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchstart", onTouch);
    };
  }, [mounted, hidden]);

  // rAF 主循环：瞳孔与身体朝指针方向平滑跟随；指针静止 4 秒后眼睛自己四处张望
  useEffect(() => {
    if (!mounted || hidden || reducedRef.current) return;
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const el = wrapRef.current;
      const pupils = pupilRef.current;
      if (!el || !pupils) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const now = performance.now();
      let dx = 0;
      let dy = 0;
      const p = pointerRef.current;
      if (p && now - p.at < 4000) {
        const vx = p.x - cx;
        const vy = p.y - cy;
        const len = Math.hypot(vx, vy) || 1;
        const strength = Math.min(1, len / 240);
        dx = (vx / len) * strength;
        dy = (vy / len) * strength;
      } else {
        // 闲时张望：每 2.6 秒换一个方向
        if (now > wanderRef.current.until) {
          wanderRef.current = {
            x: (Math.random() * 2 - 1) * 0.7,
            y: (Math.random() * 2 - 1) * 0.5,
            until: now + 2600,
          };
        }
        dx = wanderRef.current.x;
        dy = wanderRef.current.y;
      }
      const cur = curRef.current;
      cur.x += (dx - cur.x) * 0.12;
      cur.y += (dy - cur.y) * 0.12;
      pupils.setAttribute("transform", `translate(${(cur.x * 3.1).toFixed(2)} ${(cur.y * 2.5).toFixed(2)})`);
      el.style.transform = `rotate(${(cur.x * 3.2).toFixed(2)}deg) translate(${(cur.x * 1.6).toFixed(2)}px, 0)`;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mounted, hidden]);

  // 眨眼：每 2.2–5.4 秒眨一次
  useEffect(() => {
    if (!mounted || hidden || reducedRef.current) return;
    let alive = true;
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t1 = setTimeout(() => {
        if (!alive) return;
        setBlinking(true);
        t2 = setTimeout(() => {
          if (!alive) return;
          setBlinking(false);
          schedule();
        }, 130);
      }, 2200 + Math.random() * 3200);
    };
    schedule();
    return () => {
      alive = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [mounted, hidden]);

  // 首次访问 6 秒后主动打一次招呼（每会话只邀一次，方便被发现）
  useEffect(() => {
    if (!mounted || hidden) return;
    if (sessionStorage.getItem(INVITED_KEY)) return;
    const id = setTimeout(() => {
      sessionStorage.setItem(INVITED_KEY, "1");
      setLineIdx(Math.floor(Math.random() * Math.max(1, lines.length)));
      setBubbleOpen(true);
    }, 6000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, hidden]);

  if (!MASCOT_ENABLED || !mounted || hidden) return null;

  const openBubble = () => {
    if (bubbleOpen) {
      setBubbleOpen(false);
      return;
    }
    setLineIdx((prev) => {
      if (lines.length <= 1) return 0;
      let next = prev;
      while (next === prev) next = Math.floor(Math.random() * lines.length);
      return next;
    });
    setBubbleOpen(true);
  };

  const openChat = () => {
    setBubbleOpen(false);
    window.dispatchEvent(new CustomEvent("ling:open-chat"));
  };

  const hideForever = () => {
    localStorage.setItem(HIDDEN_KEY, "1");
    setHidden(true);
  };

  return (
    <div className="fixed bottom-8 left-8 z-40 flex flex-col items-start select-none">
      <style>{`
        @keyframes ling-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .ling-bob { animation: ling-bob 3.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .ling-bob { animation: none; } }
      `}</style>

      {bubbleOpen && (
        <div className="mb-2 ml-1 w-60 max-w-[calc(100vw-6rem)] rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-xl p-3.5">
          <p className="text-sm leading-relaxed text-stone-800 dark:text-stone-100">
            {lines[lineIdx] ?? lines[0] ?? ""}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={openChat}
              className="bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors"
            >
              {t("chatCta")}
            </button>
            <button
              onClick={() => setBubbleOpen(false)}
              className="px-2 py-1.5 text-xs text-stone-500 dark:text-stone-400 cursor-pointer hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
            >
              {t("closeBubble")}
            </button>
          </div>
          <button
            onClick={hideForever}
            className="mt-2 text-[11px] text-stone-400 dark:text-stone-500 underline underline-offset-2 cursor-pointer hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
          >
            {t("dismiss")}
          </button>
        </div>
      )}

      <div ref={wrapRef} className="relative will-change-transform">
        <div className="ling-bob">
          <button
            onClick={openBubble}
            aria-label={t("ariaLabel")}
            className="block w-[72px] h-[72px] cursor-pointer drop-shadow-lg"
          >
            <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
              <defs>
                <radialGradient id="ling-body" cx="50%" cy="38%" r="75%">
                  <stop offset="0%" stopColor="#fffdf5" />
                  <stop offset="55%" stopColor="#ffedb8" />
                  <stop offset="100%" stopColor="#ffd98a" />
                </radialGradient>
                <radialGradient id="ling-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fde68a" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="50" cy="52" r="46" fill="url(#ling-glow)" />
              <path
                d="M50 10 C69 10 82 27 82 47 C82 58 79 66 75 73 C71 67 67 65 63 73 C58 66 54 66 50 74 C46 66 42 66 37 73 C33 65 29 67 25 73 C21 66 18 58 18 47 C18 27 31 10 50 10 Z"
                fill="url(#ling-body)"
                stroke="rgba(180,130,60,0.35)"
                strokeWidth="1"
              />
              <path
                d="M74 12 L76.2 17.8 L82 20 L76.2 22.2 L74 28 L71.8 22.2 L66 20 L71.8 17.8 Z"
                fill="#f59e0b"
              />
              <ellipse cx="31" cy="58" rx="5" ry="3" fill="#fda4af" opacity="0.55" />
              <ellipse cx="69" cy="58" rx="5" ry="3" fill="#fda4af" opacity="0.55" />
              <g
                style={{
                  transform: blinking ? "scaleY(0.1)" : "scaleY(1)",
                  transition: "transform 70ms ease-in-out",
                  transformBox: "fill-box",
                  transformOrigin: "center",
                }}
              >
                <ellipse cx="38.5" cy="47" rx="6.5" ry="7.5" fill="#ffffff" />
                <ellipse cx="61.5" cy="47" rx="6.5" ry="7.5" fill="#ffffff" />
                <g ref={pupilRef}>
                  <circle cx="38.5" cy="47" r="3.1" fill="#292524" />
                  <circle cx="61.5" cy="47" r="3.1" fill="#292524" />
                  <circle cx="39.6" cy="45.9" r="1" fill="#ffffff" />
                  <circle cx="62.6" cy="45.9" r="1" fill="#ffffff" />
                </g>
              </g>
              <path
                d="M46 57 Q50 60.5 54 57"
                stroke="#b45309"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <button
          onClick={hideForever}
          aria-label={t("hide")}
          title={t("hide")}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-stone-900/60 dark:bg-stone-100/70 text-stone-50 dark:text-stone-900 text-[11px] leading-none flex items-center justify-center opacity-40 hover:opacity-100 focus:opacity-100 cursor-pointer transition-opacity"
        >
          ×
        </button>
      </div>
    </div>
  );
}
