"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  OUTFIT_ORDER,
  getCurrentOutfit,
  outfitStatus,
  poseSrc,
  setCurrentOutfit,
  type OutfitId,
  type PoseName,
} from "@/lib/outfit";
import {
  FURNITURE,
  FURNITURE_ORDER,
  INTIMACY_THRESHOLDS,
  type Activity,
  type FurnitureId,
  type RoomSave,
  SNACK_PRICE,
  awayMs,
  buyFurniture,
  buySnack,
  claimWelcome,
  doCheckin,
  feed,
  hasRoomCharLayer,
  intimacyLevel,
  ROOM_KEY,
  loadSave,
  persistSave,
  pickAutoTarget,
  pickDiscovery,
  playWith,
  restHer,
  roomWithHerLayers,
  settle,
  todayStr,
} from "@/lib/room";

// 慕斯的小屋（站长 2026-11-15 一期）：场景 + 她本人（单实体，活动状态机驱动）。
// 状态与规则全在 lib/room.ts，本组件只做：挂载结算、行为调度、渲染、访客操作。
// 美术：家具图层与她合体生成的互动画面同画布拆层（见 ~/workspace/muse-room 规范），
// 拥有家具后渲染家具层；她互动时家具组切换为 withHer 图层组、自由身隐藏（同屏永远一个她）。
// 她穿访客当前套装：自由身用时装库姿势图；行走默认装用小屋专用步行帧，
// 其他套装用向前冲的奔跑帧代步；互动图层只有默认装——非默认装时她只散步不互动。

const SCENE_RATIO = 9 / 16; // 场景容器高/宽（aspect 16/9），百分比换算用

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function todayNow(): string {
  return todayStr(Date.now());
}

function nowMs(): number {
  return Date.now();
}

// 可行走区（背景图实测）：右侧墙基线从 (70.5, 72.5) 斜向 (100, 97)，
// 给定脚底 y，她的中心 x 不得越过墙基线左侧 4%——她只能在地板上走，不能进墙。
function clampWalkTarget(x: number, feet: number): { x: number; feet: number } {
  const f = Math.min(98, Math.max(76, feet));
  const wallX = 70.5 + (f - 72.5) * (29.5 / 24.5);
  const maxX = Math.min(94, wallX - 4);
  return { x: Math.min(Math.max(6, x), Math.max(6, maxX)), feet: f };
}

interface ActState {
  mode: Activity;
  target: FurnitureId | null;
  resting: boolean;
}

const INTERACT_LINE_KEY: Record<string, string> = {
  bookshelf: "shelf",
  desk: "desk",
  rug: "rug",
};

// 家具图层画布的宽高比（left 居中换算用）
const FURNITURE_ASPECT: Record<FurnitureId, number> = {
  bookshelf: 1207 / 1088,
  desk: 816 / 802,
  plant: 659 / 924,
  rug: 1764 / 1293,
};

// 场景绘制顺序（后画的在上层）：靠墙的先画，前景的地毯最后
const SCENE_ORDER: FurnitureId[] = ["bookshelf", "desk", "rug"];

export function MuseRoom() {
  const t = useTranslations("Room");
  const tg = useTranslations("Garden");
  const tw = useTranslations("Wardrobe");
  const router = useRouter();
  const locale = useLocale();
  const tm = useTranslations("Mascot");
  const [save, setSave] = useState<RoomSave | null>(null);
  const [outfit, setOutfit] = useState<OutfitId>("default");
  const [act, setAct] = useState<ActState>({ mode: "idle", target: null, resting: false });
  const [herX, setHerX] = useState(50);
  const [herFeet, setHerFeet] = useState(94);
  const [facing, setFacing] = useState<"l" | "r">("l");
  const [idlePose, setIdlePose] = useState<PoseName>("look");
  const [poseOv, setPoseOv] = useState<PoseName | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [discoveryId, setDiscoveryId] = useState<string | null>(null);
  const [today, setToday] = useState<string>("");
  // 点击她 / 点地板（2026-11-17）：功能气泡、换装面板、落点光标、点按反馈
  const [levelUpFx, setLevelUpFx] = useState<string | null>(null);
  const [panel, setPanel] = useState<null | "main" | "wardrobe">(null);
  const [marker, setMarker] = useState<{ x: number; feet: number; id: number } | null>(null);
  const [tapFx, setTapFx] = useState(false);
  const [feedHL, setFeedHL] = useState(false);
  const [wardTick, setWardTick] = useState(0);
  const [walkDur, setWalkDur] = useState(2600);

  const saveRef = useRef<RoomSave | null>(null);
  const outfitRef = useRef<OutfitId>("default");
  const actRef = useRef<ActState>({ mode: "idle", target: null, resting: false });
  const herXRef = useRef(50);
  const herFeetRef = useRef(94);
  const timersRef = useRef<number[]>([]);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const herRef = useRef<HTMLDivElement | null>(null);
  const tapChainRef = useRef({ count: 0, last: 0 });
  const lastTapOkRef = useRef(0);
  const markerSeqRef = useRef(0);
  const pendingDestRef = useRef<
    | { kind: "furniture"; fid: FurnitureId; rest: boolean }
    | { kind: "point"; x: number; feet: number }
    | null
  >(null);

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  };
  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const setActBoth = (a: ActState) => {
    actRef.current = a;
    setAct(a);
  };
  const setHerXBoth = (x: number) => {
    herXRef.current = x;
    setHerX(x);
  };
  const setHerFeetBoth = (f: number) => {
    herFeetRef.current = f;
    setHerFeet(f);
  };

  const commit = (fn: (s: RoomSave) => void) => {
    let leveledTo = 0;
    setSave((prev) => {
      if (!prev) return prev;
      const before = intimacyLevel(prev.intimacyXp);
      const next: RoomSave = {
        ...prev,
        owned: [...prev.owned],
        care: { ...prev.care },
        dash: { ...prev.dash },
        quiz: { ...prev.quiz },
        discovery: { ...prev.discovery },
        interactions: { ...prev.interactions },
      };
      fn(next);
      persistSave(next);
      saveRef.current = next;
      const after = intimacyLevel(next.intimacyXp);
      if (after > before) leveledTo = after;
      return next;
    });
    // 亲密度升级反馈（W3）：横幅点名新称号与解锁内容，她的专属升级台词稍后接上
    // （GPT 评审：防「台词包解锁了但玩家没感知」；台词延迟 400ms 以免被当次动作台词覆盖）
    if (leveledTo > 0) {
      const titles = (t.raw("levelTitles") as string[] | undefined) ?? [];
      const unlocks = (t.raw("levelUnlocks") as Record<string, string> | undefined) ?? {};
      const upLines = (t.raw("levelUp") as Record<string, string> | undefined) ?? {};
      setLevelUpFx(
        t("levelUpNotice", {
          level: leveledTo,
          title: titles[leveledTo - 1] ?? "",
          unlock: unlocks[String(leveledTo)] ?? "",
        }),
      );
      later(() => setLevelUpFx(null), 5000);
      const up = upLines[String(leveledTo)];
      if (up) later(() => setLine(up), 400);
    }
  };

  const flashNotice = (msg: string) => {
    setNotice(msg);
    later(() => setNotice(null), 4200);
  };

  const linesOf = (key: string): string[] => {
    const raw = t.raw(`lines.${key}`) as string[] | undefined;
    return Array.isArray(raw) && raw.length > 0 ? raw : [];
  };

  const clickLinesOf = (key: string): string[] => {
    const raw = t.raw(`clickLines.${key}`) as string[] | undefined;
    return Array.isArray(raw) && raw.length > 0 ? raw : linesOf("idleOk");
  };

  const idleLineFor = (s: RoomSave): string => {
    if (s.satiety < 30) return pick(linesOf("idleHungry"));
    if (s.energy < 25) return pick(linesOf("idleTired"));
    if (s.mood < 35) return pick(linesOf("idleLowMood"));
    // Lv7 起她偶尔主动搭话（GPT 评审：为 Lv8 小发现铺垫）
    const extra = intimacyLevel(s.intimacyXp) >= 7 ? linesOf("proactive7") : [];
    if (s.mood >= 70) return pick([...linesOf("idleHappy"), ...extra]);
    return pick([...linesOf("idleOk"), ...extra]);
  };

  // ---------------- 活动调度 ----------------

  const startIdle = (delay: number) => {
    later(() => {
      const s = saveRef.current;
      if (!s) return;
      // Lv3 起待机小动作变多（亲密度奖励梯）
      setIdlePose(
        pick(
          intimacyLevel(s.intimacyXp) >= 3
            ? (["look", "book", "letter", "smell", "scratch", "stareyes"] as PoseName[])
            : (["look", "book", "letter"] as PoseName[]),
        ),
      );
      const { furniture, rest } = pickAutoTarget(s, Math.random());
      if (!furniture) {
        setLine(idleLineFor(s));
        startIdle(6000 + Math.random() * 4000);
        return;
      }
      goInteract(furniture, rest);
    }, delay);
  };

  const goInteract = (fid: FurnitureId, rest: boolean) => {
    const s = saveRef.current;
    if (!s) return;
    const def = FURNITURE[fid];
    // 没有互动人物层的时装：只散步过去看看，不切换图层（不穿帮）
    const canLayer = hasRoomCharLayer(outfitRef.current, fid);
    setPanel(null);
    pendingDestRef.current = { kind: "furniture", fid, rest };
    setWalkDur(2600);
    setActBoth({ mode: "walk", target: fid, resting: rest });
    setLine(pick(linesOf("walk")));
    const to = def.anchor.x;
    setFacing(to >= herXRef.current ? "r" : "l");
    setHerXBoth(to);
    setHerFeetBoth(def.anchor.feet);
    later(() => {
      setActBoth({ mode: rest ? "rest" : "interact", target: fid, resting: rest });
      if (rest) setLine(pick(linesOf("rest")));
      else if (canLayer) setLine(pick(linesOf(INTERACT_LINE_KEY[fid] ?? "idleOk")));
      else setLine(idleLineFor(saveRef.current ?? s));
      later(
        () => {
          commit((sv) => {
            sv.intimacyXp += def.intimacyXp;
            sv.interactions[fid] = (sv.interactions[fid] ?? 0) + 1;
            if (rest) sv.energy = Math.min(100, sv.energy + 12);
          });
          setActBoth({ mode: "idle", target: null, resting: false });
          startIdle(5000 + Math.random() * 3500);
        },
        rest ? 11000 : def.duration,
      );
    }, 2650);
  };

  const interruptTo = (fid: FurnitureId, rest: boolean) => {
    const cur = actRef.current;
    clearTimers();
    if ((cur.mode === "interact" || cur.mode === "rest") && cur.target) {
      // 她正贴在另一件家具上：先把自由身放回那件家具的锚点再出发
      setHerXBoth(FURNITURE[cur.target].anchor.x);
      setHerFeetBoth(FURNITURE[cur.target].anchor.feet);
    }
    setActBoth({ mode: "idle", target: null, resting: false });
    goInteract(fid, rest);
  };

  const careRest = () => {
    clearTimers();
    const s = saveRef.current;
    if (s?.owned.includes("rug")) {
      interruptTo("rug", true);
    } else {
      setActBoth({ mode: "rest", target: null, resting: true });
      setLine(pick(linesOf("rest")));
      later(() => {
        setActBoth({ mode: "idle", target: null, resting: false });
        startIdle(5000);
      }, 10000);
    }
  };

  // ---------------- 挂载：结算 + 欢迎礼 + 小发现 + 开场白 ----------------

  useEffect(() => {
    const init = window.setTimeout(() => {
      const now = Date.now();
      const raw = loadSave(now);
      const away = awayMs(raw, now);
      const first = !raw.welcomed;
      const s = settle(raw, now);
      if (first) claimWelcome(s);
      const disc = pickDiscovery(s, now, Math.random());
      persistSave(s);
      saveRef.current = s;
      setSave(s);
      setToday(todayNow());
      outfitRef.current = getCurrentOutfit();
      setOutfit(outfitRef.current);
      setDiscoveryId(disc);
      if (first) {
        setLine(t("welcomeLine"));
        flashNotice(t("welcomeGift"));
      } else if (away > 3 * 24 * 3600 * 1000) {
        setLine(pick(linesOf("reunion")));
      } else {
        // 开场白带时段问候（与桌宠同一套 Mascot.timeGreetings）
        const greetings = tm.raw("timeGreetings") as
          | Record<string, string[]>
          | undefined;
        const h = new Date().getHours();
        const band =
          h >= 23 || h < 5 ? "night" : h < 11 ? "morning" : h < 14 ? "noon" : h < 18 ? "afternoon" : "evening";
        const arr = greetings?.[band];
        if (Array.isArray(arr) && arr.length > 0) setLine(pick(arr));
        else setLine(pick(linesOf("idleHappy")));
      }
      startIdle(6000);
    }, 0);
    return () => {
      window.clearTimeout(init);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 其他标签页写入存档时同步过来（双开标签时不互相覆盖进度显示）
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== ROOM_KEY || !e.newValue) return;
      const now = Date.now();
      setSave(settle(loadSave(now), now));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // 换装同步：屋内换装面板或别处换装后，她立刻换上新套装
  useEffect(() => {
    const sync = () => {
      const o = getCurrentOutfit();
      outfitRef.current = o;
      setOutfit(o);
    };
    const bump = () => setWardTick((n) => n + 1);
    window.addEventListener("muse:outfit-changed", sync);
    window.addEventListener("muse:progress", bump);
    return () => {
      window.removeEventListener("muse:outfit-changed", sync);
      window.removeEventListener("muse:progress", bump);
    };
  }, []);

  // ---------------- 访客操作 ----------------

  const onCheckin = () => {
    let ok = false;
    commit((s) => {
      ok = doCheckin(s, Date.now());
    });
    if (ok) {
      setToday(todayNow());
      flashNotice(t("checkinDone"));
      setLine(pick(linesOf("idleHappy")));
    }
  };

  const onFeed = () => {
    let ok = false;
    commit((s) => {
      ok = feed(s);
    });
    if (ok) {
      setLine(t("feedDone"));
      setPoseOv("stareyes");
      later(() => setPoseOv(null), 1800);
    } else {
      flashNotice(t("noSnack"));
    }
  };

  const onPlay = () => {
    let ok = false;
    commit((s) => {
      ok = playWith(s, Date.now());
    });
    if (ok) {
      setLine(t("playDone"));
      setPoseOv("wave");
      later(() => setPoseOv(null), 1800);
    } else {
      flashNotice(t("playLimit"));
    }
  };

  const onRest = () => {
    let ok = false;
    commit((s) => {
      ok = restHer(s, Date.now());
    });
    if (ok) {
      flashNotice(t("restDone"));
      careRest();
    } else {
      flashNotice(t("restLimit"));
    }
  };

  const onBuySnack = () => {
    let ok = false;
    commit((s) => {
      ok = buySnack(s);
    });
    flashNotice(ok ? t("snackBought") : t("notEnough"));
  };

  const onBuy = (fid: FurnitureId) => {
    let ok = false;
    commit((s) => {
      ok = buyFurniture(s, fid);
    });
    if (ok) {
      flashNotice(t("boughtLine"));
      setLine(t("boughtLine"));
      if (FURNITURE[fid].interactive) later(() => interruptTo(fid, false), 800);
    } else {
      flashNotice(t("notEnough"));
    }
  };

  const onFurnitureTap = (fid: FurnitureId) => {
    if (!FURNITURE[fid].interactive) return;
    if (actRef.current.target === fid && actRef.current.mode !== "idle") return;
    interruptTo(fid, false);
  };

  // 点地板：她跑到落点（距离决定时长；光标在落点闪一下）
  const goTo = (x0: number, feet0: number) => {
    const { x, feet } = clampWalkTarget(x0, feet0);
    const cur = actRef.current;
    clearTimers();
    if ((cur.mode === "interact" || cur.mode === "rest") && cur.target) {
      setHerXBoth(FURNITURE[cur.target].anchor.x);
      setHerFeetBoth(FURNITURE[cur.target].anchor.feet);
    }
    setPanel(null);
    pendingDestRef.current = { kind: "point", x, feet };
    const dx = x - herXRef.current;
    const dy = feet - herFeetRef.current;
    const dist = Math.sqrt(dx * dx + Math.pow(dy * SCENE_RATIO, 2));
    const dur = Math.round(Math.min(3000, Math.max(450, dist * 45)));
    setWalkDur(dur);
    setFacing(dx >= 0 ? "r" : "l");
    setActBoth({ mode: "walk", target: null, resting: false });
    setHerXBoth(x);
    setHerFeetBoth(feet);
    later(() => {
      pendingDestRef.current = null;
      setActBoth({ mode: "idle", target: null, resting: false });
      startIdle(6000 + Math.random() * 4000);
    }, dur + 60);
  };

  const onSceneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, [data-nomove]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const yTop = ((e.clientY - rect.top) / rect.height) * 100;
    const { x: cx, feet } = clampWalkTarget(x, yTop);
    const id = ++markerSeqRef.current;
    setMarker({ x: cx, feet, id });
    window.setTimeout(() => {
      setMarker((m) => (m && m.id === id ? null : m));
    }, 1400);
    setLine(pick(linesOf("walk")));
    goTo(cx, feet);
  };

  // 点她本人：按状态给反馈；空闲时打开功能气泡（问问慕斯 / 换装 / 一起玩游戏）
  const onHerTap = () => {
    const s = saveRef.current;
    if (!s) return;
    const now = nowMs();
    const chain = tapChainRef.current;
    chain.count = now - chain.last < 2500 ? chain.count + 1 : 1;
    chain.last = now;
    const cur = actRef.current;

    // 正在家具图层里互动/休息：不打断，只抬头回一句
    if ((cur.mode === "interact" || cur.mode === "rest") && cur.target) {
      if (cur.mode === "rest") setLine(pick(clickLinesOf("rest")));
      else setLine(pick(clickLinesOf(INTERACT_LINE_KEY[cur.target] ?? "idle")));
      return;
    }
    // 原地休息中（没买地毯时）：迷糊回应，不打断
    if (cur.mode === "rest") {
      setLine(pick(clickLinesOf("rest")));
      return;
    }
    // 连戳抗议（优先于冷却判定）
    if (chain.count >= 3) {
      chain.count = 0;
      lastTapOkRef.current = now;
      setLine(pick(clickLinesOf("spam")));
      return;
    }
    if (now - lastTapOkRef.current < 1200) return;
    lastTapOkRef.current = now;

    // 走路中被点：停下来招手打招呼，然后继续去原来的目的地
    if (cur.mode === "walk") {
      const el = herRef.current;
      const sc = sceneRef.current;
      if (el && sc) {
        const r = el.getBoundingClientRect();
        const sr = sc.getBoundingClientRect();
        setHerXBoth(((r.left + r.width / 2 - sr.left) / sr.width) * 100);
        setHerFeetBoth(((r.bottom - sr.top) / sr.height) * 100);
      }
      clearTimers();
      setActBoth({ mode: "idle", target: null, resting: false });
      setPoseOv("wave");
      setLine(pick(clickLinesOf("walking")));
      later(() => {
        setPoseOv(null);
        const d = pendingDestRef.current;
        if (d?.kind === "furniture") goInteract(d.fid, d.rest);
        else if (d?.kind === "point") goTo(d.x, d.feet);
        else startIdle(4000);
      }, 1700);
      return;
    }

    // 空闲：小跳一下 + 按状态回话 + 打开功能气泡
    setTapFx(true);
    window.setTimeout(() => setTapFx(false), 650);
    if (s.satiety < 35) {
      setLine(pick(clickLinesOf("hungry")));
      setFeedHL(true);
      later(() => setFeedHL(false), 4000);
    } else if (s.energy < 30) {
      setLine(pick(clickLinesOf("tired")));
    } else if (s.mood < 35) {
      setLine(pick(clickLinesOf("lowMood")));
    } else {
      // 亲密度台词包随等级并入点击池（Lv2/4/5/6/9，GPT 评审定版）
      const lv = intimacyLevel(s.intimacyXp);
      const pool = [...clickLinesOf("idle")];
      if (lv >= 2) pool.push(...clickLinesOf("pack2"));
      if (lv >= 4) pool.push(...clickLinesOf("pack4"));
      if (lv >= 5) pool.push(...clickLinesOf("pack5"));
      if (lv >= 6) pool.push(...clickLinesOf("pack6"));
      if (lv >= 9) pool.push(...clickLinesOf("pack9"));
      setLine(pick(pool));
    }
    setPanel("main");
    later(() => {
      setPanel((p) => (p === "main" ? null : p));
    }, 9000);
  };

  // ---------------- 渲染 ----------------

  if (!save) {
    return <div className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-[#f7f1e5] dark:bg-stone-900 aspect-[16/9] animate-pulse" />;
  }

  const level = intimacyLevel(save.intimacyXp);
  const curBase = INTIMACY_THRESHOLDS[level - 1] ?? 0;
  const nextBase = INTIMACY_THRESHOLDS[level] ?? curBase + 50;
  const levelPct = Math.min(100, ((save.intimacyXp - curBase) / (nextBase - curBase)) * 100);
  const checkedIn = today !== "" && save.lastCheckin === today;

  const interactingWith = (fid: FurnitureId) =>
    (act.mode === "interact" || act.mode === "rest") && act.target === fid && hasRoomCharLayer(outfit, fid);
  const herInLayer = FURNITURE_ORDER.some((fid) => interactingWith(fid));
  const walking = act.mode === "walk";

  const freePose: PoseName =
    poseOv ?? (save.energy < 25 ? "doze" : idlePose);
  const walkSrc =
    outfit === "default"
      ? facing === "r"
        ? "/muse-room/walk.webp"
        : "/muse-room/walk-l.webp"
      : poseSrc(outfit, facing === "r" ? "runRight" : "runLeft");
  const herH = 34;
  const herAspect = 0.56;
  const herWPct = herH * herAspect * SCENE_RATIO;

  const bubbleAnchorX = herInLayer && act.target ? FURNITURE[act.target].anchor.x : herX;
  const bubbleBottom =
    act.mode === "interact" && act.target === "bookshelf"
      ? 67
      : act.mode === "interact" && act.target === "desk"
        ? 53
        : act.mode === "interact" || act.mode === "rest"
          ? 40
          : 46;

  const bar = (label: string, value: number, color: string) => (
    <div className="flex items-center gap-2 min-w-[130px] flex-1">
      <span className="text-xs text-stone-500 dark:text-stone-400 w-8 shrink-0">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${Math.round(value)}%` }} />
      </div>
      <span className="text-xs text-stone-500 dark:text-stone-400 w-7 text-right">{Math.round(value)}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes roomBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1.6%); } }
        .room-bob { animation: roomBob 0.52s ease-in-out infinite; }
        @keyframes roomMarker { 0% { transform: translate(-50%, 50%) scale(0.35); opacity: 0.95; } 100% { transform: translate(-50%, 50%) scale(1.6); opacity: 0; } }
        .room-marker-ring { animation: roomMarker 1.25s ease-out forwards; }
        @keyframes roomTap { 0% { transform: translateY(0); } 35% { transform: translateY(-4.5%) scale(1.02); } 100% { transform: translateY(0); } }
        .room-tap { animation: roomTap 0.6s ease; }
        @media (prefers-reduced-motion: reduce) { .room-bob, .room-marker-ring, .room-tap { animation: none; } }
      `}</style>

      {/* 场景（点地板任意处：她跑过去；点她本人：打开功能气泡） */}
      <div
        ref={sceneRef}
        onClick={onSceneClick}
        className="relative w-full overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 select-none"
        style={{ aspectRatio: "16/9" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/muse-room/backdrop.webp" alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />

        {/* 花架（室内花园入口，二期）：落在书桌与墙角之间的地板上，避开窗台与地毯，点它进花园页 */}
        <div
          className="absolute rounded-[50%] bg-stone-900/15 blur-[3px]"
          style={{ left: "58.9%", width: "6.4%", bottom: "17.8%", height: "1.8%" }}
        />
        <button
          type="button"
          aria-label={tg("standLabel")}
          onClick={() => router.push(`/${locale}/games/garden`)}
          className="absolute cursor-pointer group"
          style={{ left: "55.4%", bottom: "18.5%", height: "25%", aspectRatio: "899/963" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/muse-room/garden-stand.webp" alt="" className="h-full w-auto max-w-none mx-auto block transition-transform group-hover:scale-[1.03]" draggable={false} />
          <span className="absolute left-1/2 -translate-x-1/2 -bottom-1 whitespace-nowrap rounded-full bg-emerald-600/90 text-white text-[11px] px-2 py-0.5 shadow">
            🌱 {tg("standLabel")}
          </span>
        </button>

        {/* 家具（固定槽位；拥有后出现，她互动时切换图层组） */}
        {SCENE_ORDER.map((fid) => {
          const def = FURNITURE[fid];
          if (!save.owned.includes(fid)) return null;
          const withHer = interactingWith(fid);
          const layers = withHer ? roomWithHerLayers(def, outfit) : (def.layers?.alone ?? []);
          const main = layers[0];
          const rest = layers.slice(1);
          return (
            <div key={fid}>
              {/* 家具接触阴影（代码绘制，不烘焙进图层） */}
              <div
                className="absolute rounded-[50%] bg-stone-900/15 blur-[3px]"
                style={{
                  left: `${def.place.cx - def.place.h * 0.42 * SCENE_RATIO}%`,
                  width: `${def.place.h * 0.84 * SCENE_RATIO}%`,
                  bottom: `${100 - def.place.bottom - 0.8}%`,
                  height: "1.8%",
                }}
              />
              <button
                type="button"
                aria-label={t(`furnitureNames.${fid}`)}
                onClick={() => onFurnitureTap(fid)}
                className="absolute cursor-pointer"
                style={{
                  left: `${def.place.cx - (def.place.h * FURNITURE_ASPECT[fid] * SCENE_RATIO) / 2}%`,
                  bottom: `${100 - def.place.bottom}%`,
                  height: `${def.place.h}%`,
                  aspectRatio: String(FURNITURE_ASPECT[fid]),
                }}
              >
                {main && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={main} alt="" className="h-full w-auto max-w-none mx-auto block" draggable={false} />
                )}
              </button>
              {withHer &&
                rest.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="absolute max-w-none"
                    draggable={false}
                    style={{
                      left: `${def.place.cx - (def.place.h * FURNITURE_ASPECT[fid] * SCENE_RATIO) / 2}%`,
                      bottom: `${100 - def.place.bottom}%`,
                      height: `${def.place.h}%`,
                    }}
                  />
                ))}
            </div>
          );
        })}

        {/* 她的自由身（互动图层接管时隐藏——同屏永远一个她） */}
        {!herInLayer && (
          <>
            <div
              className="absolute rounded-[50%] bg-stone-900/20 blur-[3px]"
              style={{
                left: `${herX - 4.2}%`,
                width: "8.4%",
                bottom: `${100 - herFeet - 0.6}%`,
                height: "2%",
              }}
            />
            <div
              ref={herRef}
              role="button"
              aria-label={t("herLabel")}
              onClick={(e) => {
                e.stopPropagation();
                onHerTap();
              }}
              className="absolute cursor-pointer"
              style={{
                left: `${herX - herWPct / 2}%`,
                bottom: `${100 - herFeet}%`,
                height: `${herH}%`,
                transition: walking ? `left ${walkDur}ms linear, bottom ${walkDur}ms linear` : "none",
              }}
            >
              <div className={`${walking ? "room-bob" : ""} ${tapFx ? "room-tap" : ""} h-full`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={walking ? walkSrc : poseSrc(outfit, freePose)}
                  alt=""
                  className="h-full w-auto max-w-none block drop-shadow-[0_2px_3px_rgba(90,70,40,0.25)]"
                  draggable={false}
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.src.includes("/muse-pet/look.webp")) img.src = poseSrc("default", "look");
                  }}
                />
              </div>
            </div>
          </>
        )}

        {/* 点地板的落点光标（扩散环的圆心就是落点） */}
        {marker && (
          <div
            key={marker.id}
            className="room-marker-ring absolute z-10 pointer-events-none h-7 w-7 rounded-full border-2 border-amber-400 bg-amber-200/30"
            style={{ left: `${marker.x}%`, bottom: `${100 - marker.feet}%` }}
          >
            <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500" />
          </div>
        )}

        {/* 她的台词气泡（点她后带功能按钮） */}
        {line && (
          <div
            data-nomove=""
            className={`absolute z-10 ${panel ? "w-60" : "max-w-[240px]"} -translate-x-1/2 rounded-2xl rounded-bl-md bg-white/95 dark:bg-stone-800/95 shadow-md px-3 py-2`}
            style={{ left: `${Math.min(84, Math.max(16, bubbleAnchorX))}%`, bottom: `${bubbleBottom}%` }}
          >
            <p className="text-[13px] leading-snug text-stone-800 dark:text-stone-100">{line}</p>
            {panel === "main" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event("ling:open-chat"))}
                  className="px-2.5 py-1 text-xs rounded-full bg-sky-600 text-white cursor-pointer hover:bg-sky-500 transition-colors"
                >
                  {tm("chatCta")}
                </button>
                <button
                  type="button"
                  onClick={() => setPanel("wardrobe")}
                  className="px-2.5 py-1 text-xs rounded-full bg-rose-500 text-white cursor-pointer hover:bg-rose-400 transition-colors"
                >
                  {tm("wardrobeCta")}
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/${locale}/games`)}
                  className="px-2.5 py-1 text-xs rounded-full bg-violet-500 text-white cursor-pointer hover:bg-violet-400 transition-colors"
                >
                  {tm("playCta")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 屋内换装面板（复用时装库状态，换上立刻生效） */}
        {panel === "wardrobe" && (
          <div
            data-nomove=""
            className="absolute z-20 right-2 top-2 w-64 max-w-[78%] rounded-2xl bg-white/95 dark:bg-stone-800/95 shadow-lg p-3 overflow-y-auto"
            style={{ maxHeight: "calc(100% - 16px)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{tw("title")}</p>
              <button
                type="button"
                aria-label="close"
                onClick={() => setPanel(null)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer px-1"
              >
                ✕
              </button>
            </div>
            <div key={wardTick} className="space-y-2">
              {OUTFIT_ORDER.map((id) => {
                const st = outfitStatus(id);
                const wearingNow = outfit === id;
                return (
                  <div key={id} className="flex items-center gap-2.5">
                    <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md bg-[#faf6ec] dark:bg-stone-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={poseSrc(id, "look")}
                        alt=""
                        className="h-full w-full object-cover object-top"
                        style={st.unlocked ? undefined : { filter: "brightness(0)" }}
                        draggable={false}
                      />
                      {!st.unlocked && (
                        <span className="absolute inset-0 flex items-center justify-center text-amber-500 font-bold">?</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-stone-800 dark:text-stone-100 leading-tight">{tw(`names.${id}`)}</p>
                      {!st.unlocked && (
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
                          {tw(`conditions.${id}`)}
                          {st.progress ? ` · ${st.progress.value} / ${st.progress.target}` : ""}
                        </p>
                      )}
                    </div>
                    {wearingNow ? (
                      <span className="text-[11px] text-rose-500 shrink-0">{tw("wearing")}</span>
                    ) : st.unlocked ? (
                      <button
                        type="button"
                        onClick={() => setCurrentOutfit(id)}
                        className="px-2.5 py-1 text-[11px] rounded-full bg-rose-500 text-white cursor-pointer hover:bg-rose-400 transition-colors shrink-0"
                      >
                        {tw("wear")}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-stone-400 dark:text-stone-500 leading-snug">{tw("hint")}</p>
          </div>
        )}
      </div>

      {/* 亲密度升级横幅（W3） */}
      {levelUpFx && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-4 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-300">
          💗 {levelUpFx}
        </div>
      )}

      {/* 状态与照顾 */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 p-4 space-y-4 bg-white/60 dark:bg-stone-900/40">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">★ {save.stars} <span className="text-stone-500 dark:text-stone-400 font-normal">{t("starsLabel")}</span></span>
          <span className="text-sm text-stone-600 dark:text-stone-300">🍰 {t("snackLabel")} × {save.snacks}</span>
          <span className="text-sm text-stone-600 dark:text-stone-300">
            {t("intimacyLabel")} Lv.{level}
            {((t.raw("levelTitles") as string[] | undefined) ?? [])[level - 1] && (
              <span className="ml-1.5 text-xs font-medium text-rose-500 dark:text-rose-400">
                {((t.raw("levelTitles") as string[])[level - 1])}
              </span>
            )}
            <span className="ml-2 inline-block align-middle w-24 h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
              <span className="block h-full bg-rose-400 rounded-full transition-all duration-700" style={{ width: `${levelPct}%` }} />
            </span>
            <span className="ml-2 text-xs text-stone-400">{level < 10 ? t("nextLevel", { xp: nextBase - save.intimacyXp, next: level + 1 }) : ""}</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {bar(t("status.satiety"), save.satiety, "bg-amber-400")}
          {bar(t("status.mood"), save.mood, "bg-rose-400")}
          {bar(t("status.energy"), save.energy, "bg-sky-400")}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onCheckin}
            disabled={checkedIn}
            className="px-3 py-1.5 text-sm rounded-full bg-amber-500 text-white font-medium cursor-pointer hover:bg-amber-600 transition-colors disabled:bg-stone-300 dark:disabled:bg-stone-700 disabled:cursor-default"
          >
            {checkedIn ? `✓ ${t("checkedIn")}` : `★ ${t("checkin")}`}
          </button>
          <button onClick={onFeed} className={`px-3 py-1.5 text-sm rounded-full border border-amber-400 text-amber-700 dark:text-amber-300 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950 transition-colors ${feedHL ? "ring-2 ring-amber-400 animate-pulse" : ""}`}>
            🍰 {t("feed")}
          </button>
          <button onClick={onPlay} className="px-3 py-1.5 text-sm rounded-full border border-rose-300 text-rose-600 dark:text-rose-300 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors">
            ✿ {t("play")}
          </button>
          <button onClick={onRest} className="px-3 py-1.5 text-sm rounded-full border border-sky-300 text-sky-700 dark:text-sky-300 cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-950 transition-colors">
            ☾ {t("rest")}
          </button>
          <button onClick={onBuySnack} className="px-3 py-1.5 text-sm rounded-full border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
            🛒 {t("buySnack")} · {SNACK_PRICE}★
          </button>
        </div>
        {notice && <p className="text-sm text-amber-700 dark:text-amber-300">{notice}</p>}
      </div>

      {/* 今日小发现 */}
      {discoveryId && (
        <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 px-4 py-3">
          <p className="text-xs tracking-wider uppercase text-amber-600 dark:text-amber-400 font-medium mb-1">✦ {t("discoveryTitle")}</p>
          <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed">{t(`discovery.${discoveryId}`)}</p>
        </div>
      )}

      {/* 家具小店 */}
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-serif text-stone-900 dark:text-stone-100">{t("shopTitle")}</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-light">{t("shopHint")}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SCENE_ORDER.map((fid) => {
            const def = FURNITURE[fid];
            const owned = save.owned.includes(fid);
            const thumb = def.layers?.alone[0];
            return (
              <div key={fid} className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden bg-[#faf6ec] dark:bg-stone-900/40">
                <div className="h-28 flex items-end justify-center pt-2">
                  {thumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="max-h-full w-auto object-contain" draggable={false} />
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{t(`furnitureNames.${fid}`)}</p>
                  {owned ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">✓ {t("ownedLabel")}</p>
                  ) : (
                    <button
                      onClick={() => onBuy(fid)}
                      className="w-full px-3 py-1.5 text-sm rounded-full bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 font-medium cursor-pointer hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors"
                    >
                      ★ {def.price} · {t("buy")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed">
          {t("dashNote")} {t("quizNote")}
        </p>
      </div>

      {/* 玩法说明 */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 p-4 bg-white/60 dark:bg-stone-900/40">
        <h3 className="text-sm font-medium text-stone-800 dark:text-stone-100 mb-2">{t("rulesTitle")}</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-stone-600 dark:text-stone-300 font-light leading-relaxed">
          {(t.raw("rules") as string[]).map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
