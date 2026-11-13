"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { parsePage, pageKey, type PageInfo } from "@/lib/page-guide";
import { getTripById } from "@/lib/travel-data";

// 慕斯桌宠：站长的小代理，住在页面左下角（2026-11-13 路线 A 上线，当晚按
// 站长追加要求升级）：
// - 形象：Bilibili 频道吉祥物慕斯的 v3 定稿抠图（cuts-v3 → WebP，public/muse-pet/）。
// - 自由拖动：可拖到页面任意位置放着，位置存 localStorage，刷新/换页不丢；
//   拖动时换「被提溜起来」姿势（站长选定慌张版：兜帽被攥成一束、身体垂着
//   挣扎，接入时按身体等大放大 1.43 倍、帽尖向上伸出框外）+ 钟摆式晃动 +
//   影子拉长；拖到拖动时固定出现在页面顶部中央的投放气泡上松手（变 present
//   姿势）打开小游戏——气泡必须视口固定，挂在她头顶会跟着她一起跑、永远拖不到；
//   投中后她回到被拖起前的位置，不留在投放点。
// - 尺寸：站长 2026-11-13 定版为高 168px（窄屏 152），约 CHAT 方块高的 2 倍
//   （此前 84 版太小、139 溢出版太大）。全部姿势按同一身体高度规范裁切
//   （严阈值取形、高 560），且图片按高度驱动渲染（h-full w-auto）——注意 bob
//   层必须带 h-full，否则高度链断裂、图片会按宽度撑出自然高（各姿势宽高比
//   不同 → 忽大忽小），同日晚间站长反馈后定位修复。
// - 互动：点击轮换反应姿势 wave→wink→stareyes→scratch→sorry 并开气泡说话；
//   整体朝指针视差倾斜（2.5D），切换带弹跳、按下压扁。
// - 待机生活：18 秒没人理 → 轮流看书/看信/闻闻/张望；75 秒 → 打盹（专用睡觉
//   姿势——站长选定的站着打盹版生成图，绿幕键控 + 点头 + Zzz；此前拿睁眼待机
//   图冒充被站长指出）。一碰就醒，待机计时重新开始。
// - 页面感知（2026-11-13 站长需求 v2）：进入一个页面时她用预写台词介绍这页
//   （同一页面一次会话只介绍一次）；点击她时按页面分工说话——首页/留言板给
//   指引，相册/实验室/个人介绍给感想（多条随机，相册详情页结合当前照片的
//   说明）。台词在 messages 的 PageGuide 命名空间（三语），页面解析与聊天窗
//   共用 lib/page-guide.ts。
// - 三方向停靠探头（站长 2026-11-14 定版，图经多轮候选挑选）：拖到屏幕
//   左/右/下边缘松手 → 她换上专用的「暗中观察」探头图贴边躲好——侧边是歪头
//   版（只露头和扒边的手，右侧用镜像图），底边是趴边版（只露兜帽顶、眼睛和
//   两只小手）；点一下回到原位。停靠中不轮换待机姿势、不打盹、不弹气泡。
// - 点 × 藏起后，再打开聊天窗她会回来（ling:chat-opened）。
// 聊天窗里也是慕斯本人（同日晚间站长决定与小灵合并）。纯前端、无后端调用。
// 开关：NEXT_PUBLIC_LING_MASCOT_ENABLED=0 时整体不渲染（默认开；键名沿用历史）。
const MASCOT_ENABLED = process.env.NEXT_PUBLIC_LING_MASCOT_ENABLED !== "0";
const HIDDEN_KEY = "ling_mascot_hidden";
const INVITED_KEY = "ling_mascot_invited";
const POS_KEY = "muse_pet_pos";
const SEEN_KEY = "muse_page_seen";

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
  | "doze"
  | "peekSide"
  | "peekSideR"
  | "peekBottom";

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
  peekSide: "/muse-pet/peek-side.webp",
  peekSideR: "/muse-pet/peek-side-r.webp",
  peekBottom: "/muse-pet/peek-bottom.webp",
};
// lifted 图里兜帽被拉长，身体只占总高约 70%——拖动态按此倍数放大回等大
const LIFT_SCALE = 1.43;
// 停靠探头图的宽高比：侧边图 357×560（切边在图的一侧，贴屏边时整图露完）；
// 底边图 679×400（横宽图，切边在底部，按固定显示宽渲染）
const PEEK_SIDE_ASPECT = 357 / 560;
const PEEK_BOTTOM_ASPECT = 679 / 400;
const REACTIONS: Pose[] = ["wave", "wink", "stareyes", "scratch", "sorry"];
const IDLE_ALT: Pose[] = ["book", "letter", "smell", "look"];
const IDLE_AFTER_MS = 18000;
const DOZE_AFTER_MS = 75000;

function clampPos(p: { x: number; y: number }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    x: Math.max(-24, Math.min(vw - 96, p.x)),
    y: Math.max(0, Math.min(vh - 96, p.y)),
  };
}

function defaultPos() {
  const wide = window.innerWidth >= 480;
  const h = wide ? 168 : 152;
  return { x: wide ? 32 : 20, y: window.innerHeight - h - (wide ? 32 : 20) };
}

export function LingMascot() {
  const t = useTranslations("Mascot");
  const lines = (t.raw("lines") as string[]) ?? [];
  const tg = useTranslations("PageGuide");
  const tt = useTranslations("Trips");
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 20, y: 20 });
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [lineIdx, setLineIdx] = useState(0);
  const [pageLine, setPageLine] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [zoneHot, setZoneHot] = useState(false);
  const [sway, setSway] = useState(0);
  const [idlePose, setIdlePose] = useState<Pose>("look");
  const [dozing, setDozing] = useState(false);
  const [reaction, setReaction] = useState<Pose | null>(null);
  const [pressed, setPressed] = useState(false);
  // 三方向停靠（拖到屏幕左/右/下边缘时换探头图贴边，点击才出来）与出入场动画状态
  const [dock, setDock] = useState<"left" | "right" | "bottom" | null>(null);
  const [entering, setEntering] = useState(false);
  const [leaving, setLeaving] = useState(false);

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
  const introShownRef = useRef(false);
  const lastPoolPickRef = useRef("");
  const reactionIdxRef = useRef(0);
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dockRef = useRef<"left" | "right" | "bottom" | null>(null);
  const lastTouchRef = useRef(0);

  // 停靠中强制探头姿势（按停靠方向选图），压过待机/打盹/反应轮换
  const shownPose: Pose =
    dock && !dragging
      ? dock === "left"
        ? "peekSide"
        : dock === "right"
          ? "peekSideR"
          : "peekBottom"
      : dragging
        ? zoneHot
          ? "present"
          : "lifted"
        : (reaction ?? (dozing ? "doze" : idlePose));
  const bubbleBelow = pos.y < 330;

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  useEffect(() => {
    dockRef.current = dock;
  }, [dock]);

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

  // 召唤（站长 2026-11-14）：她被藏起来时右下角挂「召唤慕斯」按钮（取代原
  // CHAT 按钮成为显隐开关）；点一下她出来、招手打招呼并打开气泡——气泡里的
  // 「问问慕斯」就是聊天入口。她出来时按钮消失；首次访问默认她就在外面。
  const summon = () => {
    localStorage.removeItem(HIDDEN_KEY);
    setHidden(false);
    touch();
    // 出场动画：从下方弹入（muse-enter），动画后段再招手开气泡打招呼
    setEntering(true);
    setTimeout(() => setEntering(false), 750);
    setTimeout(() => {
      playReaction("wave");
      setPageLine(null);
      setLineIdx(0);
      setBubbleOpen(true);
    }, 380);
  };

  // ---- 页面感知：当前页解析 / 介绍文 / 点击台词池 ----
  const currentInfo = (): PageInfo =>
    parsePage(pathname ?? "", typeof window !== "undefined" ? window.location.search : "");

  const tripTitle = (tripId: string): string | null => {
    if (!getTripById(tripId)) return null;
    const title = tt(`${tripId}.title`);
    return title && !title.includes(".title") ? title : null;
  };

  const introText = (info: PageInfo): string | null => {
    switch (info.kind) {
      case "home":
      case "profile":
      case "lab":
      case "travels":
      case "guestbook":
        return tg(`${info.kind}.intro`);
      case "trip": {
        const title = info.tripId ? tripTitle(info.tripId) : null;
        const count = info.tripId ? getTripById(info.tripId)?.photos.length : 0;
        return title ? tg("trip.intro", { title, count: count ?? 0 }) : null;
      }
      default:
        return null;
    }
  };

  const buildPool = (info: PageInfo): string[] | null => {
    switch (info.kind) {
      case "home":
        return (tg.raw("home.guide") as string[]) ?? [];
      case "guestbook":
        return (tg.raw("guestbook.guide") as string[]) ?? [];
      case "profile":
      case "lab":
      case "travels":
        return (tg.raw(`${info.kind}.feel`) as string[]) ?? [];
      case "trip": {
        const title = info.tripId ? tripTitle(info.tripId) : null;
        if (!title || !info.tripId) return null;
        const pool = [tg("trip.feel", { title })];
        const caption = tt(`${info.tripId}.photos.${info.photo ?? 1}`);
        if (caption && !caption.includes(".photos.")) {
          for (const tpl of (tg.raw("trip.photoFeel") as string[]) ?? []) {
            pool.push(tpl.replace("{caption}", caption));
          }
        }
        return pool;
      }
      default:
        return null;
    }
  };

  const pickFromPool = (pool: string[]): string => {
    let pick = pool[Math.floor(Math.random() * pool.length)];
    let guard = 0;
    while (pool.length > 1 && pick === lastPoolPickRef.current && guard++ < 6) {
      pick = pool[Math.floor(Math.random() * pool.length)];
    }
    lastPoolPickRef.current = pick;
    return pick;
  };

  // 挂载后读 localStorage（setTimeout 写法与 chat-bot 一致，避开 lint 同步 setState 规则）。
  // 同时注册「聊天窗打开 → 桌宠回来」监听：藏起后点 Chat 即可复活。
  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    lastTouchRef.current = Date.now();
    const revive = () => {
      // 若正在播放消失动画，取消它（别把刚回来的她又藏掉）
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
      setLeaving(false);
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
      // 底边停靠时探头图的下切边必须贴死屏幕底边，视差倾斜/漂移会让切边
      // 抬起露缝——停靠在底边时停用倾斜变换
      if (dockRef.current === "bottom") {
        el.style.transform = "";
        return;
      }
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

  // 首次访问 6 秒后主动打一次招呼（每会话只邀一次，方便被发现），并挥手；
  // 若页面介绍已经先一步打过招呼，本邀请跳过，避免连着弹两次。
  useEffect(() => {
    if (!mounted || hidden || dock) return;
    if (sessionStorage.getItem(INVITED_KEY)) return;
    const id = setTimeout(() => {
      if (introShownRef.current) return;
      sessionStorage.setItem(INVITED_KEY, "1");
      setLineIdx(0);
      setPageLine(null);
      setBubbleOpen(true);
      playReaction("wave");
    }, 6000);
    return () => clearTimeout(id);
  }, [mounted, hidden, dock]);

  // 进入新页面 → 她介绍这页（同一页面一次会话只介绍一次，sessionStorage 去重）
  useEffect(() => {
    if (!mounted || hidden || dock) return;
    const info = parsePage(pathname ?? "", window.location.search);
    if (info.kind === "other") return;
    const key = pageKey(info);
    let seen: string[] = [];
    try {
      seen = JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]") as string[];
    } catch {
      seen = [];
    }
    if (seen.includes(key)) return;
    const text = introText(info);
    if (!text) return;
    seen.push(key);
    try {
      sessionStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    } catch {
      /* 存不下就每次都介绍 */
    }
    const id = setTimeout(() => {
      introShownRef.current = true;
      try {
        sessionStorage.setItem(INVITED_KEY, "1");
      } catch {
        /* 忽略 */
      }
      touch();
      setPageLine(text);
      setBubbleOpen(true);
      playReaction("wave");
    }, 900);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, mounted, hidden, dock]);

  if (!MASCOT_ENABLED || !mounted) return null;

  if (hidden) {
    return (
      <button
        onClick={summon}
        className="fixed bottom-8 right-8 z-40 h-16 px-5 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 border border-stone-900 dark:border-stone-100 flex items-center justify-center text-xs tracking-wider uppercase font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-all cursor-pointer shadow-lg"
      >
        {t("summon")}
      </button>
    );
  }

  const toggleBubble = () => {
    touch();
    if (bubbleOpen) {
      setBubbleOpen(false);
      return;
    }
    const pose = REACTIONS[reactionIdxRef.current % REACTIONS.length];
    reactionIdxRef.current += 1;
    playReaction(pose);
    // 在有页面台词池的页面（首页/留言板=指引，相册/实验室/个人介绍=感想，
    // 相册详情=结合当前照片），优先说页面台词；其它页面用通用台词轮换。
    const pool = buildPool(currentInfo());
    if (pool && pool.length > 0) {
      setPageLine(pickFromPool(pool));
    } else {
      setPageLine(null);
      setLineIdx((prev) => {
        if (lines.length <= 1) return 0;
        let next = prev;
        while (next === prev) next = Math.floor(Math.random() * lines.length);
        return next;
      });
    }
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
    if (leaving) return;
    // 消失动画：先缩下去淡出（muse-leave），动画完了才真正藏起来
    setBubbleOpen(false);
    setDock(null);
    setLeaving(true);
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      localStorage.setItem(HIDDEN_KEY, "1");
      setHidden(true);
      setLeaving(false);
    }, 360);
  };

  // ---- 自由拖动：拖到哪儿放哪儿；拖进投放气泡松手 → 打开小游戏 ----
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (leaving) return;
    // 停靠中：点一下先出来，不触发拖动也不开气泡
    if (dock) {
      setDock(null);
      suppressClickRef.current = Date.now();
      touch();
      return;
    }
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
      if (zoneHotRef.current) {
        // 投进游戏气泡：游戏打开的同时她回到被拖起前的位置（不留在投放点）
        const origin = { x: d.originX, y: d.originY };
        setPos(origin);
        try {
          localStorage.setItem(POS_KEY, JSON.stringify(origin));
        } catch {
          /* 存不下就算了 */
        }
        openGame();
      } else {
        try {
          localStorage.setItem(POS_KEY, JSON.stringify(posRef.current));
        } catch {
          /* 存不下就算了 */
        }
        // 拖到屏幕左/右/下边缘松手 → 停靠：换探头图贴边躲好，点击才出来
        // （角落优先判左右：拖到左下/右下角算侧边停靠）
        const px = posRef.current.x;
        const py = posRef.current.y;
        const wide = window.innerWidth >= 480;
        const w = wide ? 144 : 128;
        const h = wide ? 168 : 152;
        if (px <= 6) setDock("left");
        else if (px + w >= window.innerWidth - 6) setDock("right");
        else if (py + h >= window.innerHeight - 6) setDock("bottom");
        else setDock(null);
      }
    }
    dragRef.current = null;
    zoneHotRef.current = false;
    setDragging(false);
    setZoneHot(false);
  };

  const onClick = () => {
    if (leaving) return;
    if (Date.now() - suppressClickRef.current < 250) return;
    toggleBubble();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleBubble();
    }
  };

  const wide = typeof window !== "undefined" && window.innerWidth >= 480;
  const petW = wide ? 144 : 128;
  const petH = wide ? 168 : 152;
  // 侧探头：图片按高度驱动渲染（宽 = 高 × 宽高比），在框内水平居中——把框
  // 往屏外推「居中留白」的量，图的有画一侧就正好贴齐屏幕边缘、整图露完。
  const sideImgW = petH * PEEK_SIDE_ASPECT;
  const sideInset = (petW - sideImgW) / 2;
  // 底探头：横宽图按固定显示宽渲染（宽 200/170，高随之确定）
  const bottomImgW = wide ? 200 : 170;
  const bottomImgH = bottomImgW / PEEK_BOTTOM_ASPECT;
  const renderX =
    dock === "left"
      ? -sideInset
      : dock === "right"
        ? window.innerWidth - petW + sideInset
        : dock === "bottom"
          ? Math.max(
              (bottomImgW - petW) / 2,
              Math.min(window.innerWidth - petW - (bottomImgW - petW) / 2, pos.x),
            )
          : pos.x;
  // 底探头图是顶对齐渲染的：框顶 = 屏高 − 图高，图的下切边正好落在屏幕底边
  const renderY = dock === "bottom" ? window.innerHeight - bottomImgH : pos.y;

  return (
    <div
      className="fixed z-40 select-none"
      style={{
        left: renderX,
        top: renderY,
        transition: dragging ? "none" : "left .45s cubic-bezier(.34,1.25,.5,1), top .45s cubic-bezier(.34,1.25,.5,1)",
      }}
    >
      <style>{`
        @keyframes ling-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .ling-bob { animation: ling-bob 3.4s ease-in-out infinite; }
        @keyframes ling-zone { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .ling-zone { animation: ling-zone 1.1s ease-in-out infinite; }
        @keyframes muse-pop { 0% { transform: scale(0.9) translateY(3px); } 55% { transform: scale(1.045) translateY(-2px); } 100% { transform: scale(1) translateY(0); } }
        .muse-pop { animation: muse-pop .38s ease-out; }
        @keyframes muse-enter { 0% { transform: translateY(28px) scale(0.55); opacity: 0; } 55% { transform: translateY(-5px) scale(1.05); opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        .muse-enter { animation: muse-enter .55s cubic-bezier(.34,1.35,.5,1); }
        @keyframes muse-leave { 0% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; } 100% { transform: translateY(22px) scale(0.5) rotate(-5deg); opacity: 0; } }
        .muse-leave { animation: muse-leave .36s ease-in forwards; }
        @keyframes muse-doze { from { transform: rotate(0deg) translateY(0); } to { transform: rotate(2.8deg) translateY(3px); } }
        .muse-doze { animation: muse-doze 2.6s ease-in-out infinite alternate; transform-origin: 50% 92%; }
        @keyframes muse-zzz { 0% { opacity: 0; transform: translate(0, 6px) scale(0.7) rotate(-6deg); } 30% { opacity: 1; } 100% { opacity: 0; transform: translate(13px, -30px) scale(1.15) rotate(8deg); } }
        .muse-z { animation: muse-zzz 2.8s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .ling-bob, .ling-zone, .muse-pop, .muse-enter, .muse-leave, .muse-doze, .muse-z { animation: none; } }
      `}</style>

      <div className="relative w-[128px] h-[152px] min-[480px]:w-[144px] min-[480px]:h-[168px]">
        {bubbleOpen && !dragging && (
          <div
            className={`absolute left-0 z-20 w-60 max-w-[calc(100vw-3rem)] rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-xl p-3.5 ${
              bubbleBelow ? "top-full mt-2" : "bottom-full mb-1"
            }`}
          >
            <p className="text-sm leading-relaxed text-stone-800 dark:text-stone-100">
              {pageLine ?? lines[lineIdx] ?? lines[0] ?? ""}
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
        {dozing && !dragging && !dock && (
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
            <div className={`h-full w-full ${dock === "bottom" ? "" : dozing ? "muse-doze" : "ling-bob"}`}>
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
                  className={`${leaving ? "muse-leave" : entering ? "muse-enter" : "muse-pop"} w-full h-full`}
                  style={{
                    // 拖动态的放大不能放这层：muse-pop 弹跳动画在播放期间会覆盖
                    // 行内 transform，动画一结束缩放才突然生效——表现为「拖着过
                    // 一会儿突然变大」。放大改放 img 本身（见下），与动画层叠加。
                    transform: pressed && !dragging ? "scale(0.94, 0.9)" : undefined,
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
                    style={{
                      // 底探头是横宽图，不能按框高撑满：固定图高（行内样式压
                      // 过 h-full），图宽按比例，居中溢出框外两侧
                      height: dock === "bottom" ? bottomImgH : undefined,
                      transform: dragging ? (zoneHot ? "scale(1.04)" : `scale(${LIFT_SCALE})`) : undefined,
                      transformOrigin: "50% 100%",
                      transition: "transform .15s ease-out",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        {!dragging && !dock && (
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
