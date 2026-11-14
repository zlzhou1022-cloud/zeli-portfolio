"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { getCurrentOutfit, poseSrc, type OutfitId, type PoseName } from "@/lib/outfit";
import {
  FURNITURE,
  FURNITURE_ORDER,
  INTIMACY_THRESHOLDS,
  type Activity,
  type FurnitureId,
  type RoomSave,
  awayMs,
  buyFurniture,
  claimWelcome,
  doCheckin,
  feed,
  intimacyLevel,
  loadSave,
  persistSave,
  pickAutoTarget,
  pickDiscovery,
  playWith,
  restHer,
  settle,
  todayStr,
} from "@/lib/room";

// 慕斯的小屋（站长 2026-11-15 一期）：场景 + 她本人（单实体，活动状态机驱动）。
// 状态与规则全在 lib/room.ts，本组件只做：挂载结算、行为调度、渲染、访客操作。
// 美术：家具图层与她合体生成的互动画面同画布拆层（见 ~/workspace/muse-room 规范），
// 拥有家具后渲染家具层；她互动时家具组切换为 withHer 图层组、自由身隐藏（同屏永远一个她）。
// 她穿访客当前套装：自由身用时装库姿势图；行走默认装用小屋专用步行帧，
// 其他套装用向前冲的奔跑帧代步；互动图层只有默认装——非默认装时她只散步不互动。

const SCENE_RATIO = 5 / 8; // 场景容器高/宽（aspect 8/5），百分比换算用

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function todayNow(): string {
  return todayStr(Date.now());
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

// 地毯互动人物层（合体图画布）与单体地毯（另一画布）的对位参数
const RUG_CHAR_PLACE = { cx: 60, bottom: 99.5, h: 42 };

// 家具图层画布的宽高比（left 居中换算用）
const FURNITURE_ASPECT: Record<FurnitureId, number> = {
  bookshelf: 1104 / 1974,
  desk: 1169 / 1885,
  plant: 1076 / 1545,
  rug: 1165 / 628,
};

export function MuseRoom() {
  const t = useTranslations("Room");
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

  const saveRef = useRef<RoomSave | null>(null);
  const outfitRef = useRef<OutfitId>("default");
  const actRef = useRef<ActState>({ mode: "idle", target: null, resting: false });
  const herXRef = useRef(50);
  const timersRef = useRef<number[]>([]);

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

  const commit = (fn: (s: RoomSave) => void) => {
    setSave((prev) => {
      if (!prev) return prev;
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
      return next;
    });
  };

  const flashNotice = (msg: string) => {
    setNotice(msg);
    later(() => setNotice(null), 4200);
  };

  const linesOf = (key: string): string[] => {
    const raw = t.raw(`lines.${key}`) as string[] | undefined;
    return Array.isArray(raw) && raw.length > 0 ? raw : [];
  };

  const idleLineFor = (s: RoomSave): string => {
    if (s.satiety < 30) return pick(linesOf("idleHungry"));
    if (s.energy < 25) return pick(linesOf("idleTired"));
    if (s.mood < 35) return pick(linesOf("idleLowMood"));
    if (s.mood >= 70) return pick(linesOf("idleHappy"));
    return pick(linesOf("idleOk"));
  };

  // ---------------- 活动调度 ----------------

  const startIdle = (delay: number) => {
    later(() => {
      const s = saveRef.current;
      if (!s) return;
      setIdlePose(pick(["look", "book", "letter"] as PoseName[]));
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
    // 非默认装没有互动图层：只散步过去看看，不切换图层（不穿帮）
    const canLayer = outfitRef.current === "default";
    setActBoth({ mode: "walk", target: fid, resting: rest });
    setLine(pick(linesOf("walk")));
    const to = def.anchor.x;
    setFacing(to >= herXRef.current ? "r" : "l");
    setHerXBoth(to);
    setHerFeet(def.anchor.feet);
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
      setHerFeet(FURNITURE[cur.target].anchor.feet);
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

  // ---------------- 渲染 ----------------

  if (!save) {
    return <div className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-[#f7f1e5] dark:bg-stone-900 aspect-[8/5] animate-pulse" />;
  }

  const level = intimacyLevel(save.intimacyXp);
  const curBase = INTIMACY_THRESHOLDS[level - 1] ?? 0;
  const nextBase = INTIMACY_THRESHOLDS[level] ?? curBase + 50;
  const levelPct = Math.min(100, ((save.intimacyXp - curBase) / (nextBase - curBase)) * 100);
  const checkedIn = today !== "" && save.lastCheckin === today;

  const interactingWith = (fid: FurnitureId) =>
    (act.mode === "interact" || act.mode === "rest") && act.target === fid && outfit === "default";
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
      ? 78
      : act.mode === "interact" && act.target === "desk"
        ? 64
        : act.mode === "interact" || act.mode === "rest"
          ? 56
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
        @media (prefers-reduced-motion: reduce) { .room-bob { animation: none; } }
      `}</style>

      {/* 场景 */}
      <div className="relative w-full overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 select-none" style={{ aspectRatio: "8/5" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/muse-room/backdrop.webp" alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />

        {/* 家具（固定槽位；拥有后出现，她互动时切换图层组） */}
        {FURNITURE_ORDER.map((fid) => {
          const def = FURNITURE[fid];
          if (!save.owned.includes(fid)) return null;
          const withHer = interactingWith(fid);
          const layers = withHer ? (def.layers?.withHer ?? []) : (def.layers?.alone ?? []);
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
                    style={
                      fid === "rug"
                        ? {
                            left: `${RUG_CHAR_PLACE.cx - (RUG_CHAR_PLACE.h * 0.728 * SCENE_RATIO) / 2}%`,
                            bottom: `${100 - RUG_CHAR_PLACE.bottom}%`,
                            height: `${RUG_CHAR_PLACE.h}%`,
                          }
                        : {
                            left: `${def.place.cx - (def.place.h * FURNITURE_ASPECT[fid] * SCENE_RATIO) / 2}%`,
                            bottom: `${100 - def.place.bottom}%`,
                            height: `${def.place.h}%`,
                          }
                    }
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
              className="absolute"
              style={{
                left: `${herX - herWPct / 2}%`,
                bottom: `${100 - herFeet}%`,
                height: `${herH}%`,
                transition: walking ? "left 2.6s linear, bottom 2.6s linear" : "none",
              }}
            >
              <div className={walking ? "room-bob h-full" : "h-full"}>
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

        {/* 她的台词气泡 */}
        {line && (
          <div
            className="absolute z-10 max-w-[240px] -translate-x-1/2 rounded-2xl rounded-bl-md bg-white/95 dark:bg-stone-800/95 shadow-md px-3 py-2"
            style={{ left: `${Math.min(84, Math.max(16, bubbleAnchorX))}%`, bottom: `${bubbleBottom}%` }}
          >
            <p className="text-[13px] leading-snug text-stone-800 dark:text-stone-100">{line}</p>
          </div>
        )}
      </div>

      {/* 状态与照顾 */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 p-4 space-y-4 bg-white/60 dark:bg-stone-900/40">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">★ {save.stars} <span className="text-stone-500 dark:text-stone-400 font-normal">{t("starsLabel")}</span></span>
          <span className="text-sm text-stone-600 dark:text-stone-300">🍰 {t("snackLabel")} × {save.snacks}</span>
          <span className="text-sm text-stone-600 dark:text-stone-300">
            {t("intimacyLabel")} Lv.{level}
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
          <button onClick={onFeed} className="px-3 py-1.5 text-sm rounded-full border border-amber-400 text-amber-700 dark:text-amber-300 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950 transition-colors">
            🍰 {t("feed")}
          </button>
          <button onClick={onPlay} className="px-3 py-1.5 text-sm rounded-full border border-rose-300 text-rose-600 dark:text-rose-300 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors">
            ✿ {t("play")}
          </button>
          <button onClick={onRest} className="px-3 py-1.5 text-sm rounded-full border border-sky-300 text-sky-700 dark:text-sky-300 cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-950 transition-colors">
            ☾ {t("rest")}
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
          {FURNITURE_ORDER.map((fid) => {
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
