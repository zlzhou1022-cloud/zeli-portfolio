"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// 慕斯桌宠（站长 2026-11-13 拍板「路线 A」）：左下角的桌宠换成 Bilibili 频道
// 吉祥物慕斯本人来串门——聊天窗仍是小灵（右下角），分工不混。
// 素材：自媒体定稿 v3 抠图（cuts-v3）压成 WebP，共 9 个姿势：
//   待机 look/book 轮换；点击轮换反应 wave→wink→stareyes→scratch→sorry；
//   拖动 reach，拖到投放气泡上变 present 并松手打开小游戏。
// 半 3D 感：整体朝指针方向视差倾斜 + 姿势切换弹跳 + 按压缩扁（单张平面图的 2.5D 手法）。
// 纯前端、无后端调用、不吃聊天配额。点 × 藏起后，再打开聊天窗她会回来。
// 开关：NEXT_PUBLIC_LING_MASCOT_ENABLED=0 时整体不渲染（默认开；键名沿用历史）。
const MASCOT_ENABLED = process.env.NEXT_PUBLIC_LING_MASCOT_ENABLED !== "0";
const HIDDEN_KEY = "ling_mascot_hidden";
const INVITED_KEY = "ling_mascot_invited";

type Pose =
  | "look"
  | "book"
  | "wave"
  | "wink"
  | "stareyes"
  | "scratch"
  | "sorry"
  | "reach"
  | "present";

const POSES: Record<Pose, string> = {
  look: "/muse-pet/look.webp",
  book: "/muse-pet/book.webp",
  wave: "/muse-pet/wave.webp",
  wink: "/muse-pet/wink.webp",
  stareyes: "/muse-pet/stareyes.webp",
  scratch: "/muse-pet/scratch.webp",
  sorry: "/muse-pet/sorry.webp",
  reach: "/muse-pet/reach.webp",
  present: "/muse-pet/present.webp",
};
const REACTIONS: Pose[] = ["wave", "wink", "stareyes", "scratch", "sorry"];

export function LingMascot() {
  const t = useTranslations("Mascot");
  const lines = (t.raw("lines") as string[]) ?? [];

  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [lineIdx, setLineIdx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [zoneHot, setZoneHot] = useState(false);
  const [idlePose, setIdlePose] = useState<Pose>("look");
  const [reaction, setReaction] = useState<Pose | null>(null);
  const [pressed, setPressed] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{ x: number; y: number; at: number } | null>(null);
  const wanderRef = useRef<{ x: number; y: number; until: number }>({ x: 0, y: 0, until: 0 });
  const curRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const reducedRef = useRef(false);
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const zoneHotRef = useRef(false);
  const suppressClickRef = useRef(0);
  const reactionIdxRef = useRef(0);
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shownPose: Pose = dragging ? (zoneHot ? "present" : "reach") : reaction ?? idlePose;

  const playReaction = (pose: Pose) => {
    setReaction(pose);
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    reactionTimerRef.current = setTimeout(() => setReaction(null), 1900);
  };

  // 挂载后读 localStorage（setTimeout 写法与 chat-bot 一致，避开 lint 同步 setState 规则）。
  // 同时注册「聊天窗打开 → 桌宠回来」监听：藏起后点 Chat 即可复活。
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

  // 其余姿势图在挂载后预加载，切换时不闪烁
  useEffect(() => {
    if (!mounted) return;
    Object.values(POSES).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [mounted]);

  // 待机生活感：look（站着张望）与 book（抱书读）每 16 秒轮换
  useEffect(() => {
    if (!mounted || hidden) return;
    const id = setInterval(() => {
      setIdlePose((p) => (p === "look" ? "book" : "look"));
    }, 16000);
    return () => clearInterval(id);
  }, [mounted, hidden]);

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

  // rAF 主循环：整只桌宠朝指针方向平滑倾斜/漂移（2.5D 视差）；指针静止 4 秒后
  // 自己轻轻四处张望。拖动中暂停（拖动层接管位置）。
  useEffect(() => {
    if (!mounted || hidden || reducedRef.current) return;
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (draggingRef.current) return;
      const el = wrapRef.current;
      if (!el) return;
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
        const strength = Math.min(1, len / 260);
        dx = (vx / len) * strength;
        dy = (vy / len) * strength;
      } else {
        if (now > wanderRef.current.until) {
          wanderRef.current = {
            x: (Math.random() * 2 - 1) * 0.55,
            y: (Math.random() * 2 - 1) * 0.35,
            until: now + 2800,
          };
        }
        dx = wanderRef.current.x;
        dy = wanderRef.current.y;
      }
      const cur = curRef.current;
      cur.x += (dx - cur.x) * 0.09;
      cur.y += (dy - cur.y) * 0.09;
      el.style.transform = `rotate(${(cur.x * 2.6).toFixed(2)}deg) translate(${(cur.x * 3.4).toFixed(2)}px, ${(cur.y * 2.2).toFixed(2)}px)`;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mounted, hidden]);

  // 首次访问 6 秒后主动打一次招呼（每会话只邀一次，方便被发现），并挥手
  useEffect(() => {
    if (!mounted || hidden) return;
    if (sessionStorage.getItem(INVITED_KEY)) return;
    const id = setTimeout(() => {
      sessionStorage.setItem(INVITED_KEY, "1");
      setLineIdx(0);
      setBubbleOpen(true);
      playReaction("wave");
    }, 6000);
    return () => clearTimeout(id);
  }, [mounted, hidden]);

  if (!MASCOT_ENABLED || !mounted || hidden) return null;

  const toggleBubble = () => {
    if (bubbleOpen) {
      setBubbleOpen(false);
      return;
    }
    // 每开一次气泡轮换一个反应姿势，台词跟着轮换到不同句
    const pose = REACTIONS[reactionIdxRef.current % REACTIONS.length];
    reactionIdxRef.current += 1;
    playReaction(pose);
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
    setPressed(true);
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
      dragRef.current.style.transform = `translate(${dx}px, ${dy}px) scale(1.05)`;
      const z = zoneRef.current?.getBoundingClientRect();
      const hot = !!z && e.clientX >= z.left && e.clientX <= z.right && e.clientY >= z.top && e.clientY <= z.bottom;
      if (hot !== zoneHotRef.current) {
        zoneHotRef.current = hot;
        setZoneHot(hot);
      }
    }
  };

  const endDrag = () => {
    setPressed(false);
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
    <div className="fixed bottom-5 left-5 min-[480px]:bottom-8 min-[480px]:left-8 z-40 flex flex-col items-start select-none">
      <style>{`
        @keyframes ling-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .ling-bob { animation: ling-bob 3.4s ease-in-out infinite; }
        @keyframes ling-zone { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .ling-zone { animation: ling-zone 1.1s ease-in-out infinite; }
        @keyframes muse-pop { 0% { transform: scale(0.9) translateY(3px); } 55% { transform: scale(1.045) translateY(-2px); } 100% { transform: scale(1) translateY(0); } }
        .muse-pop { animation: muse-pop .38s ease-out; }
        @media (prefers-reduced-motion: reduce) { .ling-bob, .ling-zone, .muse-pop { animation: none; } }
      `}</style>

      {bubbleOpen && !dragging && (
        <div className="mb-1 ml-1 w-60 max-w-[calc(100vw-6rem)] rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-xl p-3.5">
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

      {/* 拖放目标气泡：拖动时出现在桌宠上方 */}
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
              className="block w-[118px] h-[138px] min-[480px]:w-[138px] min-[480px]:h-[162px] cursor-grab active:cursor-grabbing outline-none"
              style={{ touchAction: "none" }}
            >
              <div
                key={shownPose}
                className="muse-pop w-full h-full"
                style={{
                  transform: pressed && !dragging ? "scale(0.94, 0.9)" : undefined,
                  transition: "transform .15s ease-out",
                  filter: "drop-shadow(0 10px 14px rgba(60,50,30,0.28))",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={POSES[shownPose]}
                  alt=""
                  draggable={false}
                  className="w-full h-full object-contain object-bottom pointer-events-none"
                />
              </div>
            </div>
          </div>
          {!dragging && (
            <button
              onClick={hideForNow}
              aria-label={t("hide")}
              title={t("hide")}
              className="absolute top-0 -right-2 w-5 h-5 rounded-full bg-stone-900/60 dark:bg-stone-100/70 text-stone-50 dark:text-stone-900 text-[11px] leading-none flex items-center justify-center opacity-40 hover:opacity-100 focus:opacity-100 cursor-pointer transition-opacity"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
