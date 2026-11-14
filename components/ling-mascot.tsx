"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { parsePage, pageKey, type PageInfo } from "@/lib/page-guide";
import { getTripById } from "@/lib/travel-data";
import {
  type OutfitId,
  POSE_FILES,
  OUTFIT_ORDER,
  OUTFIT_READY,
  OUTFIT_LIFT_SCALE,
  poseSrc,
  getCurrentOutfit,
  setCurrentOutfit,
  outfitStatus,
  wasToasted,
  markToasted,
} from "@/lib/outfit";

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
// - 时装库（站长 2026-11-14）：套装靠成就解锁（运动装=小游戏单局 ≥300 分、
//   学生制服=猜县答对 1 个、和风袴装=留言板留言、旅行装=集章 47/47），判定
//   与姿势路径都在 lib/outfit.ts；气泡里「换装」开面板换装，桌宠/小游戏/
//   猜县头像三处共用同一穿着（muse_outfit + muse:outfit-changed 事件同步）；
//   新解锁时她冒泡提示一次（muse:progress 事件触发检查）。
// - 点 × 藏起后，再打开聊天窗她会回来（ling:chat-opened）。
// 聊天窗里也是慕斯本人（同日晚间站长决定与小灵合并）。纯前端、无后端调用。
// 开关：NEXT_PUBLIC_LING_MASCOT_ENABLED=0 时整体不渲染（默认开；键名沿用历史）。
const MASCOT_ENABLED = process.env.NEXT_PUBLIC_LING_MASCOT_ENABLED !== "0";
const HIDDEN_KEY = "ling_mascot_hidden";
const INVITED_KEY = "ling_mascot_invited";
const POS_KEY = "muse_pet_pos";
const SEEN_KEY = "muse_page_seen";

// 解锁庆祝彩带（站长 2026-11-14）：达成解锁条件时全屏飘彩带 + 顶部横幅。
// 纯 DOM/CSS 实现，不引库；碎片参数在模块层生成（避开组件内随机数 lint 规则）。
type ConfettiPiece = {
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  round: boolean;
  drift: number;
};
const CONFETTI_COLORS = ["#f43f5e", "#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6", "#ec4899"];
function makeConfettiPieces(count = 72): ConfettiPiece[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.9,
    duration: 2.8 + Math.random() * 1.8,
    size: 6 + Math.random() * 7,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    round: Math.random() < 0.3,
    drift: Math.round((Math.random() - 0.5) * 160),
  }));
}

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

// 姿势图路径按当前套装解析（lib/outfit.ts 的 poseSrc）：默认装在
// /muse-pet/ 根下，其余套装在 /muse-pet/<套装>/ 同名文件。
// lifted 图里身体占比逐套不同，拖动态的放大倍数在 OUTFIT_LIFT_SCALE 里逐套校准。
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
  const tw = useTranslations("Wardrobe");
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
  // 时装库：当前套装、换装面板开关、解锁提示台词（优先于页面台词显示）、
  // 当前套装探头图的实测宽高比（停靠尺寸数学按图比例算，逐套不同）
  const [outfit, setOutfit] = useState<OutfitId>("default");
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [toastLine, setToastLine] = useState<string | null>(null);
  // 解锁庆祝：彩带碎片 + 顶部横幅（与气泡报喜同时触发，6.5 秒后自动散场）
  const [celebration, setCelebration] = useState<{ id: OutfitId; pieces: ConfettiPiece[] } | null>(null);
  const celebrateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [peekAspect, setPeekAspect] = useState({ side: PEEK_SIDE_ASPECT, bottom: PEEK_BOTTOM_ASPECT });

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

  // 解锁提示检查：有「图已备齐 + 刚解锁 + 还没提示过」的套装就冒泡报喜一次。
  // 挂载时查一遍（补提示），成就变化（muse:progress）时再查。她藏着时不提示、
  // 也不记标记，等她出来再报。
  const checkUnlockToasts = () => {
    if (localStorage.getItem(HIDDEN_KEY) === "1") return;
    for (const id of OUTFIT_ORDER) {
      if (id === "default") continue;
      if (outfitStatus(id).unlocked && !wasToasted(id)) {
        markToasted(id);
        touch();
        playReaction("wave");
        // 图还没齐的套装也庆祝，只是文案说明还在赶制中，不许诺能立刻换上
        setToastLine(
          OUTFIT_READY.includes(id)
            ? tw(`unlockLines.${id}`)
            : tw("unlockPendingLine", { name: tw(`names.${id}`) }),
        );
        setBubbleOpen(true);
        // 同步全屏庆祝：彩带 + 顶部横幅（减少动效时只出横幅不出彩带）
        setCelebration({ id, pieces: reducedRef.current ? [] : makeConfettiPieces() });
        if (celebrateTimerRef.current) clearTimeout(celebrateTimerRef.current);
        celebrateTimerRef.current = setTimeout(() => setCelebration(null), 6500);
        break;
      }
    }
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
    // 时装库同步：别处（换装面板/小游戏/猜县）改了穿着或成就进度，这里跟上
    const onOutfitChanged = () => setOutfit(getCurrentOutfit());
    const onProgress = () => checkUnlockToasts();
    window.addEventListener("muse:outfit-changed", onOutfitChanged);
    window.addEventListener("muse:progress", onProgress);
    const id = setTimeout(() => {
      setOutfit(getCurrentOutfit());
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
      // 补提示：上次访问期间解锁了还没报喜的套装
      checkUnlockToasts();
    }, 0);
    return () => {
      clearTimeout(id);
      window.removeEventListener("ling:chat-opened", revive);
      window.removeEventListener("muse:outfit-changed", onOutfitChanged);
      window.removeEventListener("muse:progress", onProgress);
    };
    // checkUnlockToasts 只用 setState 与文案函数，挂载时跑一次即可
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 窗口尺寸变化时把桌宠夹回可视范围
  useEffect(() => {
    if (!mounted) return;
    const onResize = () => setPos((p) => clampPos(p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mounted]);

  // 当前套装的姿势图在挂载/换装后预加载，切换时不闪烁；顺带实测探头图
  // 宽高比（停靠尺寸数学按当前套装的图比例算）
  useEffect(() => {
    if (!mounted) return;
    (Object.keys(POSE_FILES) as (keyof typeof POSE_FILES)[]).forEach((pose) => {
      const img = new Image();
      img.src = poseSrc(outfit, pose);
    });
    const side = new Image();
    side.onload = () => {
      if (side.naturalHeight > 0) {
        setPeekAspect((a) => ({ ...a, side: side.naturalWidth / side.naturalHeight }));
      }
    };
    side.src = poseSrc(outfit, "peekSide");
    const bottom = new Image();
    bottom.onload = () => {
      if (bottom.naturalHeight > 0) {
        setPeekAspect((a) => ({ ...a, bottom: bottom.naturalWidth / bottom.naturalHeight }));
      }
    };
    bottom.src = poseSrc(outfit, "peekBottom");
  }, [mounted, outfit]);

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
      setWardrobeOpen(false);
      setToastLine(null);
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
  // 停靠探头的大小按站长要求对齐「站立时脑袋的大小」（2026-11-14 反馈初版
  // 撑满框太大）：侧图显示高 124/112（不再撑满 168/152 的框高，贴框底放），
  // 底图显示宽 100/88。与站立图并排比对定的尺寸，脑袋视觉大小基本一致。
  const sideImgH = wide ? 124 : 112;
  const sideImgW = sideImgH * peekAspect.side;
  // 侧探头图在框内水平居中——把框往屏外推「居中留白」的量，图的有画一侧
  // 就正好贴齐屏幕边缘、整图露完。
  const sideInset = (petW - sideImgW) / 2;
  // 底探头：横宽图按固定显示宽渲染（高随之确定）
  const bottomImgW = wide ? 100 : 88;
  const bottomImgH = bottomImgW / peekAspect.bottom;
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

  const dismissCelebration = () => {
    if (celebrateTimerRef.current) clearTimeout(celebrateTimerRef.current);
    setCelebration(null);
  };
  const goWardrobe = () => {
    dismissCelebration();
    touch();
    setBubbleOpen(true);
    setWardrobeOpen(true);
  };

  return (
    <>
      {celebration && (
        <>
          <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden>
            {celebration.pieces.map((p, i) => (
              <span
                key={i}
                className="muse-confetti-piece"
                style={
                  {
                    left: `${p.left}%`,
                    width: p.size,
                    height: p.round ? p.size : p.size * 0.45,
                    backgroundColor: p.color,
                    borderRadius: p.round ? "50%" : "1px",
                    animationDuration: `${p.duration}s`,
                    animationDelay: `${p.delay}s`,
                    "--dx": `${p.drift}px`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
          <div className="muse-celebrate fixed left-1/2 top-4 z-[81] flex w-[min(92vw,26rem)] items-center gap-3 rounded-2xl border border-rose-200 dark:border-rose-800 bg-white/95 dark:bg-stone-900/95 p-3 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={OUTFIT_READY.includes(celebration.id) ? poseSrc(celebration.id, "look") : `/muse-pet/${celebration.id}/preview.webp`}
              alt=""
              className="h-14 w-11 shrink-0 object-cover object-top"
            />
            <p className="min-w-0 flex-1 text-[13px] leading-snug text-stone-800 dark:text-stone-100">
              🎉 {tw(`unlockLines.${celebration.id}`)}
            </p>
            <button
              onClick={goWardrobe}
              className="shrink-0 cursor-pointer rounded-full bg-rose-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-rose-600"
            >
              {t("wardrobeCta")}
            </button>
            <button
              onClick={dismissCelebration}
              aria-label={t("closeBubble")}
              className="shrink-0 cursor-pointer px-1 text-base leading-none text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            >
              ×
            </button>
          </div>
        </>
      )}
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
        @keyframes muse-confetti-fall { 0% { transform: translate3d(0, -6vh, 0) rotate(0deg); opacity: 1; } 88% { opacity: 1; } 100% { transform: translate3d(var(--dx, 0px), 106vh, 0) rotate(660deg); opacity: 0.5; } }
        .muse-confetti-piece { position: absolute; top: 0; display: block; transform: translateY(-6vh); animation-name: muse-confetti-fall; animation-timing-function: linear; animation-fill-mode: forwards; }
        @keyframes muse-celebrate-in { 0% { transform: translate(-50%, -140%); } 62% { transform: translate(-50%, 8%); } 100% { transform: translate(-50%, 0); } }
        .muse-celebrate { animation: muse-celebrate-in .55s cubic-bezier(.3,1.3,.5,1) both; }
        @media (prefers-reduced-motion: reduce) { .ling-bob, .ling-zone, .muse-pop, .muse-enter, .muse-leave, .muse-doze, .muse-z, .muse-confetti-piece, .muse-celebrate { animation: none; } }
      `}</style>

      <div className="relative w-[128px] h-[152px] min-[480px]:w-[144px] min-[480px]:h-[168px]">
        {bubbleOpen && !dragging && (
          <div
            className={`absolute left-0 z-20 ${wardrobeOpen ? "w-72" : "w-60"} max-w-[calc(100vw-3rem)] rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-xl p-3.5 ${
              bubbleBelow ? "top-full mt-2" : "bottom-full mb-1"
            }`}
          >
            {wardrobeOpen ? (
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-50">{tw("title")}</p>
                  <button
                    onClick={() => setWardrobeOpen(false)}
                    aria-label={t("closeBubble")}
                    className="px-1.5 text-sm text-stone-400 cursor-pointer hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                  >
                    ×
                  </button>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{tw("hint")}</p>
                <div className="mt-2.5 space-y-2">
                  {OUTFIT_ORDER.map((id) => {
                    const st = outfitStatus(id);
                    const ready = OUTFIT_READY.includes(id);
                    const wearing = outfit === id;
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-2.5 rounded-xl border border-stone-200 dark:border-stone-700 p-2"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={OUTFIT_READY.includes(id) ? poseSrc(id, "look") : `/muse-pet/${id}/preview.webp`}
                          alt=""
                          className="h-12 w-9 object-cover object-top shrink-0"
                          onError={(e) => {
                            // 图还没上线的套装：缩略图回落默认装，别露破图
                            const el = e.currentTarget;
                            const fallback = poseSrc("default", "look");
                            if (!el.src.endsWith(fallback)) el.src = fallback;
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-stone-800 dark:text-stone-100">{tw(`names.${id}`)}</p>
                          <p className="text-[11px] leading-snug text-stone-500 dark:text-stone-400">
                            {tw(`conditions.${id}`)}
                            {!st.unlocked && st.progress.target
                              ? ` · ${tw("progress", { value: st.progress.value ?? 0, target: st.progress.target })}`
                              : ""}
                          </p>
                        </div>
                        {wearing ? (
                          <span className="shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-1 text-[11px] font-medium">
                            {tw("wearing")}
                          </span>
                        ) : st.unlocked && ready ? (
                          <button
                            onClick={() => setCurrentOutfit(id)}
                            className="shrink-0 rounded-full bg-rose-500 text-white px-2.5 py-1 text-[11px] font-medium cursor-pointer hover:bg-rose-600 transition-colors"
                          >
                            {tw("wear")}
                          </button>
                        ) : st.unlocked ? (
                          <span className="shrink-0 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 px-2 py-1 text-[11px]">
                            {tw("preparing")}
                          </span>
                        ) : (
                          <span className="shrink-0 px-1 text-xs" aria-hidden>
                            🔒
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-stone-800 dark:text-stone-100">
                  {toastLine ?? pageLine ?? lines[lineIdx] ?? lines[0] ?? ""}
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
                    onClick={() => setWardrobeOpen(true)}
                    className="border border-rose-300 text-rose-600 dark:text-rose-300 px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                  >
                    {t("wardrobeCta")}
                  </button>
                  <button
                    onClick={() => {
                      setBubbleOpen(false);
                      setToastLine(null);
                    }}
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
              </>
            )}
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
                  key={`${outfit}-${shownPose}`}
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
                    src={poseSrc(outfit, shownPose)}
                    onError={(e) => {
                      // 当前套装缺这张图时回落默认装同名姿势，不留空图
                      const el = e.currentTarget;
                      const fallback = poseSrc("default", shownPose);
                      if (!el.src.endsWith(fallback)) el.src = fallback;
                    }}
                    alt=""
                    draggable={false}
                    className="block h-full w-auto max-w-none mx-auto pointer-events-none"
                    style={{
                      // 停靠探头按脑袋大小定尺寸（行内样式压过 h-full）：底图
                      // 固定图高、宽按比例居中；侧图固定图高并用 marginTop
                      // 贴到框底（人小了之后贴着框底探头更自然）
                      height:
                        dock === "bottom" ? bottomImgH : dock === "left" || dock === "right" ? sideImgH : undefined,
                      marginTop: dock === "left" || dock === "right" ? petH - sideImgH : undefined,
                      transform: dragging ? (zoneHot ? "scale(1.04)" : `scale(${OUTFIT_LIFT_SCALE[outfit]})`) : undefined,
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
    </>
  );
}
