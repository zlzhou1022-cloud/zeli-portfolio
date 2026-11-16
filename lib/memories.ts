// 回忆册（小屋三期 W4，设计经 ChatGPT 评审）：里程碑事件流，独立 localStorage key。
// 事件带稳定 id 去重；历史回填（source="backfill"）的事件 date 为 null，绝不伪造日期。
// 回填只做一次（backfilled 标记），且只回填能被现有存档证明的事件。

import { todayStr, intimacyLevel, type RoomSave } from "@/lib/room";
import { getUnlockedOutfits } from "@/lib/outfit";

export const MEMORIES_KEY = "muse_memories_v1";
const GARDEN_KEY_LOCAL = "muse_garden_v1"; // 与 lib/garden 的 key 相同；这里只读原始存档判断，不 import 防耦合

export type MemoryType =
  | "first_visit"
  | "furniture"
  | "garden_visit"
  | "first_bloom"
  | "first_harvest"
  | "outfit"
  | "level";

export interface MemoryEvent {
  id: string; // `${type}:${key}`，稳定去重
  date: string | null; // yyyy-mm-dd；backfill 为 null
  type: MemoryType;
  key: string; // furniture id / outfit id / level 数字 / 固定串
  source: "live" | "backfill";
}

export interface MemoriesSave {
  version: 1;
  events: MemoryEvent[];
  backfilled: boolean;
}

export function defaultMemories(): MemoriesSave {
  return { version: 1, events: [], backfilled: false };
}

export function loadMemories(): MemoriesSave {
  try {
    const raw = localStorage.getItem(MEMORIES_KEY);
    if (!raw) return defaultMemories();
    const parsed = JSON.parse(raw) as MemoriesSave;
    if (parsed.version !== 1 || !Array.isArray(parsed.events)) return defaultMemories();
    return { ...defaultMemories(), ...parsed };
  } catch {
    return defaultMemories();
  }
}

function persistMemories(m: MemoriesSave) {
  try {
    localStorage.setItem(MEMORIES_KEY, JSON.stringify(m));
  } catch {
    /* 存储不可用时静默 */
  }
}

export function hasMemory(m: MemoriesSave, type: MemoryType, key: string): boolean {
  return m.events.some((e) => e.id === `${type}:${key}`);
}

/** 记录一条里程碑（已存在同 id 则跳过）。source=backfill 时 date 记 null。返回是否新记录。now 省略时取当前时间。 */
export function recordMemory(
  type: MemoryType,
  key: string,
  now: number = Date.now(),
  source: "live" | "backfill" = "live",
): boolean {
  const m = loadMemories();
  if (hasMemory(m, type, key)) return false;
  m.events.push({
    id: `${type}:${key}`,
    date: source === "live" ? todayStr(now) : null,
    type,
    key,
    source,
  });
  persistMemories(m);
  return true;
}

/**
 * 一次性历史回填（幂等）：只补能被存档证明的事件，日期一律 null。
 * room 为当前小屋存档（新访客传 null）；花园只读原始 localStorage 判断。
 */
export function backfillMemories(room: RoomSave | null, now: number): void {
  const m = loadMemories();
  if (m.backfilled) return;
  const add = (type: MemoryType, key: string) => {
    if (!hasMemory(m, type, key)) {
      m.events.push({ id: `${type}:${key}`, date: null, type, key, source: "backfill" });
    }
  };
  if (room?.welcomed) {
    add("first_visit", "room");
    for (const fid of room.owned) add("furniture", fid);
    const lv = intimacyLevel(room.intimacyXp);
    for (let i = 2; i <= lv; i++) add("level", String(i));
  }
  try {
    const rawGarden = localStorage.getItem(GARDEN_KEY_LOCAL);
    if (rawGarden) {
      add("garden_visit", "garden");
      const g = JSON.parse(rawGarden) as {
        totalHarvests?: number;
        album?: Record<string, unknown>;
        pots?: ({ growthDays: number } | null)[];
      };
      const bloomed =
        (g.totalHarvests ?? 0) > 0 ||
        Object.keys(g.album ?? {}).length > 0 ||
        (g.pots ?? []).some((p) => p && p.growthDays >= 10);
      if (bloomed) add("first_bloom", "bloom");
      if ((g.totalHarvests ?? 0) > 0) add("first_harvest", "harvest");
    }
  } catch {
    /* 花园存档读不到就不回填花园事件 */
  }
  for (const id of getUnlockedOutfits()) {
    if (id !== "default") add("outfit", id);
  }
  m.backfilled = true;
  persistMemories(m);
  void now;
}

/** 安全网：已解锁但还没记录的时装补记为 live（正常路径由桌宠解锁提示处即时记录）。 */
export function syncOutfitMemories(now: number): void {
  for (const id of getUnlockedOutfits()) {
    if (id !== "default") recordMemory("outfit", id, now);
  }
}
