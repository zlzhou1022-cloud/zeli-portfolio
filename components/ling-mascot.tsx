"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// 慕斯桌宠：站长的小代理，住在页面左下角（2026-11-13 路线 A 上线，当晚按
// 站长追加要求升级）：
// - 形象：Bilibili 频道吉祥物慕斯的 v3 定稿抠图（cuts-v3 → WebP，public/muse-pet/）。
// - 自由拖动：可拖到页面任意位置放着，位置存 localStorage，刷新/换页不丢；
//   拖动时换「被提溜起来」姿势（站长选定慌张版：兜帽被攥成一束、身体垂着
//   挣扎，接入时按身体等大放大 1.43 倍、帽尖向上伸出框外）+ 钟摆式晃动 +
//   影子拉长；拖到拖动时固定出现在页面顶部中央的投放气泡上松手（变 present
//   姿势）打开小游戏——气泡必须视口固定，挂在她头顶会跟着她一起跑、永远拖不到。
// - 尺寸：与最初的团子吉祥物同量级（高 76/84px）；全部姿势按同一身体高度
//   规范裁切（严阈值取形、高 560），且图片按高度驱动渲染（h-full w-auto）——
//   注意 bob 层必须带 h-full，否则高度链断裂、图片会按宽度撑出自然高（各姿势
//   宽高比不同 → 忽大忽小），2026-11-13 站长反馈后定位修复。
// - 互动：点击轮换反应姿势 wave→wink→stareyes→scratch→sorry 并开气泡说话；
//   整体朝指针视差倾斜（2.5D），切换带弹跳、按下压扁。
// - 待机生活：18 秒没人理 → 轮流看书/看信/闻闻/张望；75 秒 → 打盹（专用睡觉
//   姿势——站长选定的站着打盹版生成图，绿幕键控 + 点头 + Zzz；此前拿睁眼待机
//   图冒充被站长指出）。一碰就醒，待机计时重新开始。
// - 点 × 藏起后，再打开聊天窗她会回来（ling:chat-opened）。
// 聊天窗里也是慕斯本人（同日晚间站长决定与小灵合并）。纯前端、无后端调用。
// 开关：NEXT_PUBLIC_LING_MASCOT_ENABLED=0 时整体不渲染（默认开；键名沿用历史）。
const MASCOT_ENABLED = process.env.NEXT_PUBLIC_LING_MASCOT_ENABLED !== "0";
const HIDDEN_KEY = "ling_mascot_hidden";
const INVITED_KEY = "ling_mascot_invited";
const POS_KEY = "muse_pet_pos";

type Pose =
  | "look"
  | "book"
  | "letter"
  | "smell"
  | "wave"
  | "wink"
  | "stareyes"
  | "scratch"
  | "sorry"
  | "present"
  | "lifted"
  | "doze";

const POSES: Record<Pose, string> = {
  look: "/muse-pet/look.webp",
  book: "/muse-pet/book.webp",
  letter: "/muse-pet/letter.webp",
  smell: "/muse-pet/smell.webp",
  wave: "/muse-pet/wave.webp",
  wink: "/muse-pet/wink.webp",
  stareyes: "/muse-pet/stareyes.webp",
  scratch: "/muse-pet/scratch.webp",
  sorry: "/muse-pet/sorry.webp",
  present: "/muse-pet/present.webp",
  lifted: "/muse-pet/lifted.webp",
  doze: "/muse-pet/doze.webp",
};
// lifted 图里兜帽被拉长，身体只占总高约 70%——拖动态按此倍数放大回等大
const LIFT_SCALE = 1.43;
const REACTIONS: Pose[] = ["wave", "wink", "stareyes", "scratch", "sorry"];
const IDLE_ALT: Pose[] = ["book", "letter", "smell", "look"];
const IDLE_AFTER_MS = 18000;
const DOZE_AFTER_MS = 75000;

function clampPos(p: { x: number; y: number }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    x: Math.max(-12, Math.min(vw - 56, p.x)),
    y: Math.max(0, Math.min(vh - 56, p.y)),
  };
}

function defaultPos() {
  const wide = window.innerWidth >= 480;
  const h = wide ? 84 : 76;
  return { x: wide ? 32 : 20, y: window.innerHeight - h - (wide ? 32 : 20) };
}

export function LingMascot() {
  const t = useTranslations("Mascot");
  const lines = (t.raw("lines") as string[]) ?? [];

  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 20, y: 20 });
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [lineIdx, setLineIdx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [zoneHot, setZoneHot] = useState(false);
  const [sway, setSway] = useState(0);
  const [idlePose, setIdlePose] = useState<Pose>("look");
  const [dozing, setDozing] = useState(false);
  const [reaction, setReaction] = useState<Pose | null>(null);
  const [pressed, setPressed] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<{ x: number; y: number }>({ x: 20, y: 20 });
  const pointerRef = useRef<{ x: number; y: number; at: number } | null>(null);
  const wanderRef = useRef<{ x: number; y: number; until: number }>({ x: 0, y: 0, until: 0 });
  const curRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const reducedRef = useRef(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    lastX: number;
    lastT: number;
    active: boolean;
  } | null>(null);
  const zoneHotRef = useRef(false);
  const suppressClickRef = useRef(0);
  const reactionIdxRef = useRef(0);
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTouchRef = useRef(0);

  const shownPose: Pose = dragging ? (zoneHot ? "present" : "lifted") : reaction ?? (dozing ? "doze" : idlePose);
  const bubbleBelow = pos.y < 330;

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  const touch = () => {
    lastTouchRef.current = Date.now();
    setDozing(false);
    setIdlePose("look");
  };

  const playReaction = (pose: Pose) => {
    setReaction(pose);
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    reactionTimerRef.current = setTimeout(() => setReaction(null), 1900);
  };

  // 挂载后读 localStorage（setTimeout 写法与 chat-bot 一致，避开 lint 同步 setState 规则）。
  // 同时注册「聊天窗打开 → 桌宠回来」监听：藏起后点 Chat 即可复活。
  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    lastTouchRef.current = Date.now();
    const revive = () => {
      localStorage.removeItem(HIDDEN_KEY);
      setHidden(false);
    };
    window.addEventListener("ling:chat-opened", revive);
    const id = setTimeout(() => {
      setHidden(localStorage.getItem(HIDDEN_KEY) === "1");
      let initial = defaultPos();
      try {
        const raw = localStorage.getItem(POS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { x: number; y: number };
          if (typeof parsed.x === "number" && typeof parsed.y === "number") initial = parsed;
        }
      } catch {
        /* 位置记录坏了就用默认角落 */
      }
      setPos(clampPos(initial));
      setMounted(true);
    }, 0);
    return () => {
      clearTimeout(id);
      window.removeEventListener("ling:chat-opened", revive);
    };
  }, []);

  // 窗口尺寸变化时把桌宠夹回可视范围
  useEffect(() => {
    if (!mounted) return;
    const onResize = () => setPos((p) => clampPos(p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mounted]);

  // 其余姿势图在挂载后预加载，切换时不闪烁
  useEffect(() => {
    if (!mounted) return;
    Object.values(POSES).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [mounted]);

  // 待机生活节律：每秒检查一次「多久没人理她」
  useEffect(() => {
    if (!mounted || hidden) return;
    const id = setInterval(() => {
      if (dragRef.current?.active) return;
      const idleFor = Date.now() - lastTouchRef.current;
      if (idleFor > DOZE_AFTER_MS) {
        setIdlePose("look");
        setDozing(true);
      } else if (idleFor > IDLE_AFTER_MS) {
        setDozing(false);
        const idx = Math.floor((idleFor - IDLE_AFTER_MS) / 10000) % IDLE_ALT.length;
        setIdlePose(IDLE_ALT[idx]);
      } else {
        setDozing(false);
        setIdlePose("look");
      }
    }, 1000);
    return () => clearInterval(id);
  }, [mounted, hidden]);

  // 指针追踪（视差倾斜用）：鼠标移动 / 触摸点按都记下位置与时间
  useEffect(() => {
    if (!mounted || hidden) return;
    const onMove = (e: MouseEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY, at: performance.now() };
    };
    const onTouch = (e: TouchEvent) => {
      const touchPoint = e.touches[0];
      if (touchPoint) pointerRef.current = { x: touchPoint.clientX, y: touchPoint.clientY, at: performance.now() };
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchstart", onTouch);
    };
  }, [mounted, hidden]);

  // rAF 主循环：整只桌宠朝指针方向平滑倾斜/漂移（2.5D 视差）；指针静止 4 秒后
  // 自己轻轻四处张望。拖动中暂停（位置由拖动直接接管）。
  useEffect(() => {
    if (!mounted || hidden || reducedRef.current) return;
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (dragRef.current?.active) return;
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
    touch();
    if (bubbleOpen) {
      setBubbleOpen(false);
      return;
    }
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
    touch();
    setBubbleOpen(false);
    window.dispatchEvent(new CustomEvent("ling:open-chat"));
  };

  const openGame = () => {
    touch();
    setBubbleOpen(false);
    window.dispatchEvent(new CustomEvent("ling:open-game"));
  };

  const hideForNow = () => {
    localStorage.setItem(HIDDEN_KEY, "1");
    setHidden(true);
  };

  // ---- 自由拖动：拖到哪儿放哪儿；拖进投放气泡松手 → 打开小游戏 ----
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    touch();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
      lastX: e.clientX,
      lastT: performance.now(),
      active: false,
    };
    setPressed(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.active && Math.hypot(dx, dy) > 9) {
      d.active = true;
      setDragging(true);
      setBubbleOpen(false);
    }
    if (d.active) {
      setPos(clampPos({ x: d.originX + dx, y: d.originY + dy }));
      // 钟摆晃动：横向速度越快，身体朝反方向甩得越厉害（被拎着走的感觉）
      const now = performance.now();
      const dtMs = Math.max(16, now - d.lastT);
      const vx = (e.clientX - d.lastX) / dtMs; // px/ms
      d.lastX = e.clientX;
      d.lastT = now;
      setSway(Math.max(-17, Math.min(17, -vx * 15)));
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
    setSway(0);
    const d = dragRef.current;
    if (d?.active) {
      suppressClickRef.current = Date.now();
      touch();
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(posRef.current));
      } catch {
        /* 存不下就算了 */
      }
      if (zoneHotRef.current) openGame();
    }
    dragRef.current = null;
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
    <div className="fixed z-40 select-none" style={{ left: pos.x, top: pos.y }}>
      <style>{`
        @keyframes ling-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .ling-bob { animation: ling-bob 3.4s ease-in-out infinite; }
        @keyframes ling-zone { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .ling-zone { animation: ling-zone 1.1s ease-in-out infinite; }
        @keyframes muse-pop { 0% { transform: scale(0.9) translateY(3px); } 55% { transform: scale(1.045) translateY(-2px); } 100% { transform: scale(1) translateY(0); } }
        .muse-pop { animation: muse-pop .38s ease-out; }
        @keyframes muse-doze { from { transform: rotate(0deg) translateY(0); } to { transform: rotate(2.8deg) translateY(3px); } }
        .muse-doze { animation: muse-doze 2.6s ease-in-out infinite alternate; transform-origin: 50% 92%; }
        @keyframes muse-zzz { 0% { opacity: 0; transform: translate(0, 6px) scale(0.7) rotate(-6deg); } 30% { opacity: 1; } 100% { opacity: 0; transform: translate(13px, -30px) scale(1.15) rotate(8deg); } }
        .muse-z { animation: muse-zzz 2.8s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .ling-bob, .ling-zone, .muse-pop, .muse-doze, .muse-z { animation: none; } }
      `}</style>

      <div className="relative w-[64px] h-[76px] min-[480px]:w-[72px] min-[480px]:h-[84px]">
        {bubbleOpen && !dragging && (
          <div
            className={`absolute left-0 z-20 w-60 max-w-[calc(100vw-3rem)] rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-xl p-3.5 ${
              bubbleBelow ? "top-full mt-2" : "bottom-full mb-1"
            }`}
          >
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

        {/* 拖放目标气泡：拖动时固定在页面顶部中央（不随桌宠移动，否则永远拖不到） */}
        {dragging && (
          <div
            ref={zoneRef}
            className={`ling-zone fixed inset-x-0 top-24 z-20 mx-auto w-max whitespace-nowrap rounded-full border-2 px-4 py-2 text-sm font-medium shadow-xl pointer-events-none transition-colors ${
              zoneHot
                ? "border-sky-400 bg-sky-400 text-white"
                : "border-dashed border-sky-400 bg-white/95 dark:bg-stone-900/95 text-sky-700 dark:text-sky-300"
            }`}
          >
            ✦ {t("playCta")}
          </div>
        )}

        {/* 打盹的 Zzz */}
        {dozing && !dragging && (
          <div className="absolute -top-4 right-0 z-10 pointer-events-none font-bold text-sky-400 dark:text-sky-300">
            <span className="muse-z inline-block text-xs" style={{ animationDelay: "0s" }}>Z</span>
            <span className="muse-z inline-block text-sm ml-0.5" style={{ animationDelay: "0.9s" }}>Z</span>
            <span className="muse-z inline-block text-base ml-0.5" style={{ animationDelay: "1.8s" }}>Z</span>
          </div>
        )}

        {/* 摆动层：拖动时像被拎着一样晃；平时无变换 */}
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            transform: `rotate(${sway}deg)`,
            transformOrigin: "50% 8%",
            transition: dragging ? "transform .12s ease-out" : "transform .55s cubic-bezier(.2,.9,.3,1.35)",
          }}
        >
          <div ref={wrapRef} className="relative w-full h-full will-change-transform">
            <div className={`h-full w-full ${dozing ? "muse-doze" : "ling-bob"}`}>
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
                className="block w-full h-full cursor-grab active:cursor-grabbing outline-none"
                style={{ touchAction: "none" }}
              >
                <div
                  key={shownPose}
                  className="muse-pop w-full h-full"
                  style={{
                    transform:
                      pressed && !dragging
                        ? "scale(0.94, 0.9)"
                        : dragging
                          ? zoneHot
                            ? "scale(1.04)"
                            : `scale(${LIFT_SCALE})`
                          : undefined,
                    transformOrigin: "50% 100%",
                    transition: "transform .15s ease-out",
                    filter: dragging
                      ? "drop-shadow(0 22px 16px rgba(60,50,30,0.35))"
                      : "drop-shadow(0 10px 14px rgba(60,50,30,0.28))",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={POSES[shownPose]}
                    alt=""
                    draggable={false}
                    className="block h-full w-auto max-w-none mx-auto pointer-events-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        {!dragging && (
          <button
            onClick={hideForNow}
            aria-label={t("hide")}
            title={t("hide")}
            className="absolute top-0 -right-2 z-20 w-5 h-5 rounded-full bg-stone-900/60 dark:bg-stone-100/70 text-stone-50 dark:text-stone-900 text-[11px] leading-none flex items-center justify-center opacity-40 hover:opacity-100 focus:opacity-100 cursor-pointer transition-opacity"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
