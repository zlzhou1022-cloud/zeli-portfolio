"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getCurrentOutfit, poseSrc, type OutfitId } from "@/lib/outfit";
import { loadSave } from "@/lib/room";
import {
  BLOOM_DAYS,
  GARDENER_HARVESTS,
  SPECIES,
  SPECIES_ORDER,
  type GardenSave,
  type SpeciesId,
  buySeed,
  claimGift,
  gardenerUnlocked,
  harvest,
  loadGarden,
  mutateGarden,
  plantSeed,
  potCount,
  stageOf,
  stageSrc,
  water,
  waterAll,
} from "@/lib/garden";

// 室内花园（小屋二期）：花架点进来。种花靠浇水日推进、漏浇只暂停、开花可收可留。
// 状态在 lib/garden.ts（localStorage），星星与小屋共用钱包（lib/room）。
// 她以访客当前套装站在花园里当园丁主持，台词全是预写文案、零 LLM。

const POT_H = 13.5;

function nowMs(): number {
  return Date.now();
} // 盆高占场景高 %（各阶段按 scale 放大，盆大小恒定）

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function MuseGarden() {
  const t = useTranslations("Garden");
  const [garden, setGarden] = useState<GardenSave | null>(null);
  const [stars, setStars] = useState(0);
  const [outfit, setOutfit] = useState<OutfitId>("default");
  const [selected, setSelected] = useState<number | null>(null);
  const [line, setLine] = useState("");
  const [wateredIdx, setWateredIdx] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  const refresh = () => {
    setGarden(loadGarden());
    setStars(loadSave(nowMs()).stars);
  };

  useEffect(() => {
    const id = setTimeout(() => {
      let gifted = false;
      mutateGarden((g) => {
        gifted = claimGift(g);
      });
      refresh();
      setOutfit(getCurrentOutfit());
      setLine(gifted ? t("giftLine") : pick(t.raw("lines.welcome") as string[]));
    }, 0);
    const onOutfit = () => setOutfit(getCurrentOutfit());
    window.addEventListener("muse:outfit-changed", onOutfit);
    return () => {
      clearTimeout(id);
      window.removeEventListener("muse:outfit-changed", onOutfit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!garden) {
    return <div className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-[#f7f1e5] dark:bg-stone-900 aspect-[16/9] animate-pulse" />;
  }

  const n = garden.pots.length;
  const potCx = (i: number) => 10 + (58 / n) * (i + 0.5);
  const sel = selected !== null ? garden.pots[selected] : undefined;
  const unlocked = gardenerUnlocked(garden);

  const onWater = (idx: number) => {
    const res = water(idx, nowMs());
    refresh();
    if (res === "grew") {
      setWateredIdx(idx);
      setTimeout(() => setWateredIdx(null), 1100);
      setLine(pick(t.raw("lines.water") as string[]));
      setNotice("");
    } else if (res === "bloomed") {
      setWateredIdx(idx);
      setTimeout(() => setWateredIdx(null), 1100);
      setLine(pick(t.raw("lines.bloom") as string[]));
    } else if (res === "already") {
      setNotice(t("wateredToday"));
    }
  };

  const onHarvest = (idx: number) => {
    const res = harvest(idx, nowMs());
    if (res) {
      refresh();
      setSelected(null);
      setLine(pick(t.raw("lines.harvest") as string[]));
      setNotice(res.bonus > 0 ? t("harvestMilestone", { bonus: res.bonus }) : "");
    }
  };

  const onWaterAll = () => {
    const res = waterAll(nowMs());
    refresh();
    if (res.watered === 0) {
      setNotice(t("waterAllNone"));
      return;
    }
    setNotice(t("waterAllDone", { count: res.watered }));
    setLine(pick(t.raw(res.bloomed > 0 ? "lines.bloom" : "lines.water") as string[]));
  };

  const onBuy = (sp: SpeciesId) => {
    if (buySeed(sp)) {
      refresh();
      setNotice("");
    } else {
      setNotice(t("notEnough"));
    }
  };

  const onPlant = (idx: number, sp: SpeciesId) => {
    if (plantSeed(idx, sp, nowMs())) {
      refresh();
      setLine(pick(t.raw("lines.plant") as string[]));
      setNotice("");
    }
  };

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes gardenSway { 0%,100% { transform: rotate(0deg); } 30% { transform: rotate(1.6deg); } 65% { transform: rotate(-1.2deg); } }
        .garden-sway { animation: gardenSway 1s ease-in-out; transform-origin: 50% 100%; }
        @media (prefers-reduced-motion: reduce) { .garden-sway { animation: none; } }
      `}</style>

      {/* 场景 */}
      <div className="relative w-full overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 select-none" style={{ aspectRatio: "16/9" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/muse-garden/backdrop.webp" alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />

        {/* 花盆（地板一排，点选后在下方操作） */}
        {garden.pots.map((plant, i) => {
          const stage = plant ? stageOf(plant) : 0;
          const src = plant ? stageSrc(plant.species, stage) : stageSrc("tulip", 0);
          const scale = plant ? SPECIES[plant.species].scale[stage] : SPECIES.tulip.scale[0];
          const h = POT_H * scale;
          const wPct = h * (9 / 16) * 0.98; // 近似宽度占场景宽 %（图宽高比约 1）
          return (
            <div key={i}>
              <div
                className="absolute rounded-[50%] bg-stone-900/15 blur-[3px]"
                style={{ left: `${potCx(i) - 3.4}%`, width: "6.8%", bottom: "0.7%", height: "1.6%" }}
              />
              <button
                type="button"
                aria-label={plant ? t(`speciesNames.${plant.species}`) : t("emptyPot")}
                onClick={() => {
                  setSelected(selected === i ? null : i);
                  setNotice("");
                }}
                className={`absolute cursor-pointer transition-transform ${wateredIdx === i ? "garden-sway" : ""} ${selected === i ? "drop-shadow-[0_0_6px_rgba(217,164,65,0.9)]" : ""}`}
                style={{ left: `${potCx(i) - wPct / 2}%`, bottom: "1.4%", height: `${h}%` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-auto max-w-none mx-auto block" draggable={false} />
              </button>
            </div>
          );
        })}

        {/* 她（园丁主持，穿访客当前套装） */}
        <div className="absolute rounded-[50%] bg-stone-900/20 blur-[3px]" style={{ left: "79.8%", width: "8.4%", bottom: "1.9%", height: "2%" }} />
        <div className="absolute" style={{ left: "77.4%", bottom: "2.5%", height: "42%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poseSrc(outfit, "look")}
            alt=""
            className="h-full w-auto max-w-none block drop-shadow-[0_2px_3px_rgba(90,70,40,0.25)]"
            draggable={false}
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.src.includes("/muse-pet/look.webp")) img.src = poseSrc("default", "look");
            }}
          />
        </div>
        {line && (
          <div className="absolute z-10 max-w-[240px] -translate-x-1/2 rounded-2xl rounded-bl-md bg-white/95 dark:bg-stone-800/95 shadow-md px-3 py-2" style={{ left: "72%", bottom: "47%" }}>
            <p className="text-[13px] leading-snug text-stone-800 dark:text-stone-100">{line}</p>
          </div>
        )}
      </div>

      {/* 顶部计数 */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">★ {stars} <span className="text-stone-500 dark:text-stone-400 font-normal">{t("starsLabel")}</span></span>
        <span className="text-sm text-stone-600 dark:text-stone-300">🌱 {t("harvestCount", { count: garden.totalHarvests })}</span>
        <span className="text-sm text-stone-600 dark:text-stone-300">
          {unlocked ? t("gardenerDone") : t("gardenerProgress", { count: garden.totalHarvests, target: GARDENER_HARVESTS })}
        </span>
        <button
          type="button"
          onClick={onWaterAll}
          className="rounded-full border border-emerald-300 dark:border-emerald-800 px-3 py-1 text-sm text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
        >
          💧 {t("waterAll")}
        </button>
        {notice && <span className="text-sm text-rose-500">{notice}</span>}
      </div>

      {/* 选中花盆的操作面板 */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 p-4 bg-white/60 dark:bg-stone-900/40">
        {selected === null && <p className="text-sm text-stone-500 dark:text-stone-400">{t("tapHint")}</p>}
        {selected !== null && sel === null && (
          <div>
            <p className="text-sm font-medium text-stone-700 dark:text-stone-200 mb-3">{t("chooseSeed")}</p>
            <div className="flex flex-wrap gap-2">
              {SPECIES_ORDER.map((sp) => (
                <button
                  key={sp}
                  type="button"
                  disabled={garden.seeds[sp] <= 0}
                  onClick={() => onPlant(selected, sp)}
                  className="rounded-full border border-stone-300 dark:border-stone-700 px-3 py-1.5 text-sm enabled:hover:bg-emerald-50 dark:enabled:hover:bg-stone-800 disabled:opacity-40 transition-colors"
                >
                  {t(`speciesNames.${sp}`)} · {t("seedOwned", { count: garden.seeds[sp] })}
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-400 mt-2">{t("noSeedHint")}</p>
          </div>
        )}
        {selected !== null && sel && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={stageSrc(sel.species, stageOf(sel))} alt="" className="h-16 w-auto" draggable={false} />
            <div className="min-w-[180px]">
              <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                {t(`speciesNames.${sel.species}`)} · {t(`stageNames.${stageOf(sel)}`)}
              </p>
              <div className="mt-1.5 w-44 h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (sel.growthDays / BLOOM_DAYS) * 100)}%` }} />
              </div>
              <p className="text-xs text-stone-400 mt-1">{t("growthDays", { days: sel.growthDays, total: BLOOM_DAYS })}</p>
            </div>
            {stageOf(sel) < 4 ? (
              <button
                type="button"
                onClick={() => onWater(selected)}
                className="rounded-full bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 text-sm font-medium transition-colors"
              >
                💧 {t("water")}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onHarvest(selected)}
                  className="rounded-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-sm font-medium transition-colors"
                >
                  {t("harvest")} +6★
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLine(pick(t.raw("lines.keep") as string[]));
                    setSelected(null);
                  }}
                  className="rounded-full border border-stone-300 dark:border-stone-700 px-4 py-2 text-sm transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  {t("keep")}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 种子店 */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 p-4 bg-white/60 dark:bg-stone-900/40">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-3">{t("shopTitle")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SPECIES_ORDER.map((sp) => (
            <div key={sp} className="rounded-lg border border-stone-200 dark:border-stone-800 p-3 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={stageSrc(sp, 4)} alt="" className="h-20 w-auto mx-auto" draggable={false} />
              <p className="text-sm font-medium text-stone-700 dark:text-stone-200 mt-2">
                {t(`speciesNames.${sp}`)}
                {SPECIES[sp].seasonal && <span className="ml-1 text-[10px] align-middle rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-500 px-1.5 py-0.5">{t("seasonal")}</span>}
              </p>
              <p className="text-xs text-stone-400">{t("seedOwned", { count: garden.seeds[sp] })}</p>
              <button
                type="button"
                onClick={() => onBuy(sp)}
                className="mt-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 text-xs font-medium transition-colors"
              >
                {t("buySeed")} · {SPECIES[sp].price}★
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 图鉴与里程碑 */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 p-4 bg-white/60 dark:bg-stone-900/40">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-3">{t("albumTitle")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SPECIES_ORDER.map((sp) => {
            const rec = garden.album[sp];
            return (
              <div key={sp} className={`rounded-lg border border-stone-200 dark:border-stone-800 p-3 text-center ${rec ? "" : "opacity-50"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={stageSrc(sp, 4)} alt="" className={`h-16 w-auto mx-auto ${rec ? "" : "grayscale"}`} draggable={false} />
                <p className="text-sm text-stone-700 dark:text-stone-200 mt-1">{t(`speciesNames.${sp}`)}</p>
                <p className="text-xs text-stone-400">
                  {rec ? t("albumCount", { count: rec.count, first: rec.first }) : t("albumEmpty")}
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-stone-400 mt-3">
          {t("potsProgress", { have: potCount(garden.totalHarvests), count: garden.totalHarvests })}
        </p>
      </div>

      {/* 规则 */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 p-4 bg-white/60 dark:bg-stone-900/40">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-2">{t("rulesTitle")}</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-stone-600 dark:text-stone-300">
          {(t.raw("rules") as string[]).map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
