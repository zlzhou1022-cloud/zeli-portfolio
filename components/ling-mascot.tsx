"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// 小灵吉祥物：页面左下角的白色荧光小精灵（小灵的「身体」，聊天窗是她的「大脑」）。
// 形象：白团子 + 两只眼睛，极简（站长 2026-11-13 定稿，去嘴/腮红）。
// 行为：眼睛跟随指针、随机眨眼、点击冒气泡；可拖动——拖到上方出现的
// 「玩接光点」气泡上松手即打开小游戏；点 × 藏起后，再打开聊天窗她会回来。
// 纯前端、无后端调用、不吃聊天配额。
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
  const [dragging, setDragging] = useState(false);
  const [zoneHot, setZoneHot] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const pupilRef = useRef<SVGGElement>(null);
  const pointerRef = useRef<{ x: number; y: number; at: number } | null>(null);
  const wanderRef = useRef<{ x: number; y: number; until: number }>({ x: 0, y: 0, until: 0 });
  const curRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const reducedRef = useRef(false);
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const zoneHotRef = useRef(false);
  const suppressClickRef = useRef(0);

  // 挂载后读 localStorage（setTimeout 写法与 chat-bot 一致，避开 lint 同步 setState 规则）。
  // 同时注册「聊天窗打开 → 吉祥物回来」监听：藏起后点 Chat 即可复活。
  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revive = () => {
      localStorage.removeItem(HIDDEN_KEY);
      setHidden(false);
    };
    window.addEventListener("ling:chat-opened", revive);
    const id = setTimeout(() => {
      setHidden(localStorage.getItem(HIDDEN_KEY) === "1");
      setMounted(true);
    }, 0);
    return () => {
      clearTimeout(id);
      window.removeEventListener("ling:chat-opened", revive);
    };
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

  // rAF 主循环：瞳孔与身体朝指针方向平滑跟随；指针静止 4 秒后眼睛自己四处张望。
  // 拖动中暂停（拖动层接管位置）。
  useEffect(() => {
    if (!mounted || hidden || reducedRef.current) return;
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (draggingRef.current) return;
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

  const toggleBubble = () => {
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

  const openGame = () => {
    setBubbleOpen(false);
    window.dispatchEvent(new CustomEvent("ling:open-game"));
  };

  const hideForNow = () => {
    localStorage.setItem(HIDDEN_KEY, "1");
    setHidden(true);
  };

  // ---- 拖动：拖到投放气泡上松手 → 打开接光点 ----
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    downRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const down = downRef.current;
    if (!down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    if (!draggingRef.current && Math.hypot(dx, dy) > 9) {
      draggingRef.current = true;
      setDragging(true);
      setBubbleOpen(false);
      if (dragRef.current) dragRef.current.style.transition = "none";
    }
    if (draggingRef.current && dragRef.current) {
      dragRef.current.style.transform = `translate(${dx}px, ${dy}px) scale(1.07)`;
      const z = zoneRef.current?.getBoundingClientRect();
      const hot = !!z && e.clientX >= z.left && e.clientX <= z.right && e.clientY >= z.top && e.clientY <= z.bottom;
      if (hot !== zoneHotRef.current) {
        zoneHotRef.current = hot;
        setZoneHot(hot);
      }
    }
  };

  const endDrag = () => {
    if (draggingRef.current) {
      suppressClickRef.current = Date.now();
      if (zoneHotRef.current) openGame();
      if (dragRef.current) {
        dragRef.current.style.transition = "transform .38s cubic-bezier(.2,.9,.3,1.35)";
        dragRef.current.style.transform = "";
        setTimeout(() => {
          if (dragRef.current) dragRef.current.style.transition = "";
        }, 420);
      }
    }
    downRef.current = null;
    draggingRef.current = false;
    zoneHotRef.current = false;
    setDragging(false);
    setZoneHot(false);
  };

  const onClick = () => {
    if (Date.now() - suppressClickRef.current < 250) return;
    toggleBubble();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleBubble();
    }
  };

  return (
    <div className="fixed bottom-8 left-8 z-40 flex flex-col items-start select-none">
      <style>{`
        @keyframes ling-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .ling-bob { animation: ling-bob 3.4s ease-in-out infinite; }
        @keyframes ling-zone { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .ling-zone { animation: ling-zone 1.1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .ling-bob, .ling-zone { animation: none; } }
      `}</style>

      {bubbleOpen && !dragging && (
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
              onClick={openGame}
              className="border border-sky-400 text-sky-700 dark:text-sky-300 px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-950 transition-colors"
            >
              {t("playCta")}
            </button>
            <button
              onClick={() => setBubbleOpen(false)}
              className="px-2 py-1.5 text-xs text-stone-500 dark:text-stone-400 cursor-pointer hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
            >
              {t("closeBubble")}
            </button>
          </div>
          <button
            onClick={hideForNow}
            className="mt-2 text-[11px] text-stone-400 dark:text-stone-500 underline underline-offset-2 cursor-pointer hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
          >
            {t("dismiss")}
          </button>
        </div>
      )}

      {/* 拖放目标气泡：拖动时出现在吉祥物上方 */}
      {dragging && (
        <div
          ref={zoneRef}
          className={`ling-zone absolute left-0 -top-16 whitespace-nowrap rounded-full border-2 px-4 py-2 text-sm font-medium shadow-xl pointer-events-none transition-colors ${
            zoneHot
              ? "border-sky-400 bg-sky-400 text-white"
              : "border-dashed border-sky-400 bg-white/95 dark:bg-stone-900/95 text-sky-700 dark:text-sky-300"
          }`}
        >
          ✦ {t("playCta")}
        </div>
      )}

      <div ref={dragRef} className="relative will-change-transform">
        <div ref={wrapRef} className="relative will-change-transform">
          <div className="ling-bob">
            <div
              role="button"
              tabIndex={0}
              aria-label={t("ariaLabel")}
              onClick={onClick}
              onKeyDown={onKeyDown}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className="block w-[72px] h-[72px] cursor-grab active:cursor-grabbing drop-shadow-lg outline-none"
              style={{ touchAction: "none" }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
                <defs>
                  <radialGradient id="ling-body" cx="50%" cy="36%" r="78%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="58%" stopColor="#eef3f9" />
                    <stop offset="100%" stopColor="#d9e4f2" />
                  </radialGradient>
                  <radialGradient id="ling-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.65" />
                    <stop offset="100%" stopColor="#bae6fd" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="50" cy="52" r="47" fill="url(#ling-glow)" />
                <path
                  d="M50 10 C69 10 82 27 82 47 C82 58 79 66 75 73 C71 67 67 65 63 73 C58 66 54 66 50 74 C46 66 42 66 37 73 C33 65 29 67 25 73 C21 66 18 58 18 47 C18 27 31 10 50 10 Z"
                  fill="url(#ling-body)"
                  stroke="rgba(148,163,184,0.4)"
                  strokeWidth="1"
                />
                <g
                  style={{
                    transform: blinking ? "scaleY(0.1)" : "scaleY(1)",
                    transition: "transform 70ms ease-in-out",
                    transformBox: "fill-box",
                    transformOrigin: "center",
                  }}
                >
                  <ellipse cx="38.5" cy="47" rx="6.8" ry="7.8" fill="#ffffff" />
                  <ellipse cx="61.5" cy="47" rx="6.8" ry="7.8" fill="#ffffff" />
                  <g ref={pupilRef}>
                    <circle cx="38.5" cy="47" r="3.3" fill="#1e293b" />
                    <circle cx="61.5" cy="47" r="3.3" fill="#1e293b" />
                    <circle cx="39.7" cy="45.8" r="1.1" fill="#ffffff" />
                    <circle cx="62.7" cy="45.8" r="1.1" fill="#ffffff" />
                  </g>
                </g>
              </svg>
            </div>
          </div>
          {!dragging && (
            <button
              onClick={hideForNow}
              aria-label={t("hide")}
              title={t("hide")}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-stone-900/60 dark:bg-stone-100/70 text-stone-50 dark:text-stone-900 text-[11px] leading-none flex items-center justify-center opacity-40 hover:opacity-100 focus:opacity-100 cursor-pointer transition-opacity"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
