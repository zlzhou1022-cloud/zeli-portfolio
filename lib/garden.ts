// 室内花园（小屋二期，站长 2026-11-16 定版，机制经 ChatGPT 评审）：
// 房间角落的花架点进独立花园页；种花靠「浇水日」推进生长，不靠日历躺长；
// 漏浇只暂停、永不枯死；开花可收获（+6★、进图鉴、腾出花盆）或永久观赏。
// 状态存访客浏览器 localStorage（独立 key），星星走小屋的钱包（lib/room）。
// 累计收获里程碑：5 朵 → 花盆 4 个；6 朵 → 园丁装解锁（lib/outfit 读取）；12 朵 → 花盆 5 个。

import { applyWishAction, ensureWish, mutateSave, todayStr } from "@/lib/room";
import { notifyProgress } from "@/lib/outfit";

export const GARDEN_KEY = "muse_garden_v1";

export type SpeciesId = "tulip" | "daisy" | "pansy" | "chrys";

export interface Plant {
  species: SpeciesId;
  growthDays: number; // 有效浇水日累计（浇水才推进）
  lastWatered: string | null; // 本地日期 yyyy-mm-dd
  plantedDay: string;
}

export interface GardenSave {
  version: 1;
  pots: (Plant | null)[];
  seeds: Record<SpeciesId, number>;
  gifted: boolean;
  album: Partial<Record<SpeciesId, { first: string; count: number }>>;
  totalHarvests: number;
}

export const SPECIES_ORDER: SpeciesId[] = ["tulip", "daisy", "pansy", "chrys"];

// scale = 该阶段图高 / 盆高（本地实测）：渲染时盆高恒定，图高 = 盆高 × scale
export const SPECIES: Record<SpeciesId, { price: number; seasonal: boolean; scale: number[] }> = {
  tulip: { price: 4, seasonal: false, scale: [1.058, 1.275, 2.142, 2.432, 2.494] },
  daisy: { price: 4, seasonal: false, scale: [1.054, 1.313, 2.262, 2.168, 2.253] },
  pansy: { price: 4, seasonal: false, scale: [1.052, 1.217, 1.707, 1.881, 2.048] },
  chrys: { price: 5, seasonal: true, scale: [1.046, 1.254, 1.746, 1.995, 2.1] },
};

export const BLOOM_DAYS = 10;
export const HARVEST_STARS = 6;
export const GARDENER_HARVESTS = 6;
// 收获里程碑奖励（GPT 评审 2026-11-17 采纳）：累计收获跨过门槛时一次性加星
export const HARVEST_MILESTONES: Record<number, number> = { 3: 10, 12: 20 };

export function stageOf(p: Plant): number {
  const g = p.growthDays;
  return g >= BLOOM_DAYS ? 4 : g >= 6 ? 3 : g >= 3 ? 2 : g >= 1 ? 1 : 0;
}

export function stageSrc(species: SpeciesId, stage: number): string {
  return `/muse-garden/${species}-${stage}.webp`;
}

export function potCount(totalHarvests: number): number {
  return 3 + (totalHarvests >= 5 ? 1 : 0) + (totalHarvests >= 12 ? 1 : 0);
}

export function gardenerUnlocked(g: GardenSave): boolean {
  return g.totalHarvests >= GARDENER_HARVESTS;
}

export function defaultGarden(): GardenSave {
  return {
    version: 1,
    pots: [null, null, null],
    seeds: { tulip: 0, daisy: 0, pansy: 0, chrys: 0 },
    gifted: false,
    album: {},
    totalHarvests: 0,
  };
}

export function loadGarden(): GardenSave {
  const base = defaultGarden();
  try {
    const raw = localStorage.getItem(GARDEN_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as GardenSave;
    if (parsed.version !== 1) return base;
    const merged: GardenSave = {
      ...base,
      ...parsed,
      seeds: { ...base.seeds, ...(parsed.seeds ?? {}) },
      album: parsed.album ?? {},
    };
    // 花盆数随里程碑增长：补齐新增的空盆
    const want = potCount(merged.totalHarvests);
    while (merged.pots.length < want) merged.pots.push(null);
    return merged;
  } catch {
    return base;
  }
}

export function persistGarden(g: GardenSave) {
  try {
    localStorage.setItem(GARDEN_KEY, JSON.stringify(g));
  } catch {
    /* 存储不可用时静默（隐私模式等） */
  }
}

export function mutateGarden(fn: (g: GardenSave) => void): GardenSave {
  const g = loadGarden();
  fn(g);
  persistGarden(g);
  return g;
}

// 首次进花园的赠礼：三种常驻种子各 1 颗（评审定的首体验）
export function claimGift(g: GardenSave): boolean {
  if (g.gifted) return false;
  g.gifted = true;
  g.seeds.tulip += 1;
  g.seeds.daisy += 1;
  g.seeds.pansy += 1;
  return true;
}

export function buySeed(species: SpeciesId): boolean {
  const price = SPECIES[species].price;
  let paid = false;
  mutateSave(Date.now(), (s) => {
    if (s.stars >= price) {
      s.stars -= price;
      paid = true;
    }
  });
  if (!paid) return false;
  mutateGarden((g) => {
    g.seeds[species] += 1;
  });
  return true;
}

export function plantSeed(idx: number, species: SpeciesId, now: number): boolean {
  let ok = false;
  mutateGarden((g) => {
    if (g.pots[idx] || g.seeds[species] <= 0) return;
    g.seeds[species] -= 1;
    g.pots[idx] = { species, growthDays: 0, lastWatered: null, plantedDay: todayStr(now) };
    ok = true;
  });
  return ok;
}

export type WaterResult = "grew" | "bloomed" | "already" | "done" | "empty";

export function water(idx: number, now: number): WaterResult {
  let res = "empty" as WaterResult;
  mutateGarden((g) => {
    const p = g.pots[idx];
    if (!p) return;
    if (stageOf(p) >= 4) {
      res = "done";
      return;
    }
    const today = todayStr(now);
    if (p.lastWatered === today) {
      res = "already";
      return;
    }
    p.lastWatered = today;
    p.growthDays += 1;
    res = stageOf(p) >= 4 ? "bloomed" : "grew";
  });
  if (res === "grew" || res === "bloomed") {
    // 周愿望（W5）：有效浇水按天计数（跨页走小屋存档）
    mutateSave(now, (s) => {
      ensureWish(s, now, Math.random());
      applyWishAction(s, "water", now);
    });
  }
  return res;
}

// 一键浇水（GPT 评审 2026-11-17 采纳）：所有未开花、今天还没浇过的盆一起推进一天
export function waterAll(now: number): { watered: number; bloomed: number } {
  let watered = 0;
  let bloomed = 0;
  mutateGarden((g) => {
    const today = todayStr(now);
    for (const p of g.pots) {
      if (!p || stageOf(p) >= 4 || p.lastWatered === today) continue;
      p.lastWatered = today;
      p.growthDays += 1;
      watered += 1;
      if (stageOf(p) >= 4) bloomed += 1;
    }
  });
  if (watered > 0) {
    mutateSave(now, (s) => {
      ensureWish(s, now, Math.random());
      applyWishAction(s, "water", now);
    });
  }
  return { watered, bloomed };
}

// 收获成功返回 { bonus }（bonus = 本次跨过的里程碑奖励星数，没有为 0）；失败返回 null
export function harvest(idx: number, now: number): { bonus: number } | null {
  let ok = false;
  let bonus = 0;
  mutateGarden((g) => {
    const p = g.pots[idx];
    if (!p || stageOf(p) < 4) return;
    const rec = g.album[p.species];
    if (rec) rec.count += 1;
    else g.album[p.species] = { first: todayStr(now), count: 1 };
    const prev = g.totalHarvests;
    g.totalHarvests += 1;
    for (const [threshold, stars] of Object.entries(HARVEST_MILESTONES)) {
      if (prev < Number(threshold) && g.totalHarvests >= Number(threshold)) bonus += stars;
    }
    g.pots[idx] = null;
    const want = potCount(g.totalHarvests);
    while (g.pots.length < want) g.pots.push(null);
    ok = true;
  });
  if (!ok) return null;
  mutateSave(now, (s) => {
    s.stars += HARVEST_STARS + bonus;
    ensureWish(s, now, Math.random());
    applyWishAction(s, "harvest", now);
  });
  notifyProgress(); // 园丁装解锁庆祝走时装库的既有通道
  return { bonus };
}
