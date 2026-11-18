// 慕斯的小屋（站长 2026-11-15 定版，与 ChatGPT 评审两轮共识）：
// 养成页的状态与规则全部在这里，组件只负责渲染与调度。四区块：
//   State      —— 存档类型/默认值/版本（localStorage，无后端、无账号）
//   Settlement —— 离线衰减结算（纯函数，24 小时上限，时间回拨按 0、时间戳只进不退）
//   Economy    —— 签到/奖励/购买（事件点调用，带日期标记防重复领取）
//   Activity   —— 活动状态机转移与自动行为选择（纯函数，组件执行）
// 家具的画面配置（图层/锚点）也在本文件 FURNITURE 里——那是资产配置不是存档；
// 访客存档只记家具 ID（owned），不存任何图片路径。
// 原则：状态只让他更想回来、永不惩罚；亲密度永不衰减；衰减下限 15 不见底。

import type { OutfitId } from "@/lib/outfit";
import { isOwnerMode } from "@/lib/owner";

// ---------------------------------------------------------------- State

export const ROOM_KEY = "muse_room_v1";

export type FurnitureId = "rug" | "bookshelf" | "desk" | "plant";
export type SlotId = "rug" | "shelf" | "desk" | "corner";

export interface RoomSave {
  version: 1;
  stars: number;
  /** 饱食 / 心情 / 精力，0–100 */
  satiety: number;
  mood: number;
  energy: number;
  /** 亲密度经验（等级由 xp 现算，永不衰减） */
  intimacyXp: number;
  owned: FurnitureId[];
  snacks: number;
  welcomed: boolean;
  /** 上次结算时刻（ms）；只进不退 */
  lastSeen: number;
  lastCheckin: string | null; // 本地日期 YYYY-MM-DD
  streak: number;
  care: { date: string | null; plays: number; rests: number };
  dash: { date: string | null; settled: number; earned: number };
  quiz: { date: string | null; claimed: boolean };
  discovery: { date: string | null; id: string | null };
  interactions: Partial<Record<FurnitureId, number>>;
  wish: WishState | null;
}

export function defaultSave(now: number): RoomSave {
  return {
    version: 1,
    stars: 0,
    satiety: 80,
    mood: 85,
    energy: 90,
    intimacyXp: 0,
    owned: [],
    snacks: 1,
    welcomed: false,
    lastSeen: now,
    lastCheckin: null,
    streak: 0,
    care: { date: null, plays: 0, rests: 0 },
    dash: { date: null, settled: 0, earned: 0 },
    quiz: { date: null, claimed: false },
    discovery: { date: null, id: null },
    interactions: {},
    wish: null,
  };
}

export function loadSave(now: number): RoomSave {
  if (typeof window === "undefined") return defaultSave(now);
  try {
    const raw = localStorage.getItem(ROOM_KEY);
    if (!raw) return defaultSave(now);
    const parsed = JSON.parse(raw) as Partial<RoomSave>;
    if (parsed.version !== 1) return defaultSave(now);
    // 与默认值合并：老存档缺新字段时不崩
    return { ...defaultSave(now), ...parsed } as RoomSave;
  } catch {
    return defaultSave(now);
  }
}

export function persistSave(save: RoomSave) {
  try {
    localStorage.setItem(ROOM_KEY, JSON.stringify(save));
  } catch {
    /* 存不下就算了，不挡玩法 */
  }
}

/** 在任意页面（游戏结算处）读写小屋存档的入口：读→改→存一气呵成 */
export function mutateSave(now: number, fn: (save: RoomSave) => void): RoomSave {
  const save = settle(loadSave(now), now);
  fn(save);
  persistSave(save);
  return save;
}

export function todayStr(now: number): string {
  const d = new Date(now);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function yesterdayStr(now: number): string {
  return todayStr(now - 24 * 3600 * 1000);
}

// ----------------------------------------------------------- Settlement

/** 衰减（每小时）：饱食 −2 / 心情 −1 / 精力 −1.5；下限 15，离线最多结算 24 小时 */
export const DECAY_PER_HOUR = { satiety: 2, mood: 1, energy: 1.5 };
export const STATUS_FLOOR = 15;
const MAX_OFFLINE_MS = 24 * 3600 * 1000;

export function settle(save: RoomSave, now: number): RoomSave {
  const elapsed = Math.min(Math.max(0, now - save.lastSeen), MAX_OFFLINE_MS);
  const hours = elapsed / 3600000;
  const decay = (v: number, perHour: number) =>
    Math.max(STATUS_FLOOR, Math.round((v - perHour * hours) * 10) / 10);
  return {
    ...save,
    satiety: decay(save.satiety, DECAY_PER_HOUR.satiety),
    mood: decay(save.mood, DECAY_PER_HOUR.mood),
    energy: decay(save.energy, DECAY_PER_HOUR.energy),
    // 时间戳只进不退：访客把系统时间调回去，结算按 0，但不许把 lastSeen 倒退
    lastSeen: Math.max(save.lastSeen, now),
  };
}

/** 离开多久了（给重逢台词用）：按真实流逝算，不受 24h 结算上限影响 */
export function awayMs(save: RoomSave, now: number): number {
  return Math.max(0, now - save.lastSeen);
}

// -------------------------------------------------------------- Economy

export const WELCOME_STARS = 20;
export const CHECKIN_STARS = 10;
export const QUIZ_STARS = 5;

export function claimWelcome(save: RoomSave): boolean {
  if (save.welcomed) return false;
  save.welcomed = true;
  save.stars += WELCOME_STARS;
  return true;
}

export function canCheckin(save: RoomSave, now: number): boolean {
  return save.lastCheckin !== todayStr(now);
}

/** 每日签到：+10 星 +1 点心 +5 亲密度；连签只在展示层用 streak 夸她 */
export function doCheckin(save: RoomSave, now: number): boolean {
  if (!canCheckin(save, now)) return false;
  const today = todayStr(now);
  save.streak = save.lastCheckin === yesterdayStr(now) ? save.streak + 1 : 1;
  save.lastCheckin = today;
  save.stars += CHECKIN_STARS;
  save.snacks += 1;
  save.intimacyXp += 5;
  return true;
}

/**
 * Dash 结算（评审定版）：一局结束即占用一次当日结算名额（不满 150 分也算），
 * 每日最多 3 局；150–299 → 3 星，≥300 → 8 星（总奖，不是叠加）。
 * 返回本局实际得到的星星（名额已满时返回 -1 表示未结算）。
 */
export function settleDash(save: RoomSave, score: number, now: number): number {
  const today = todayStr(now);
  if (save.dash.date !== today) save.dash = { date: today, settled: 0, earned: 0 };
  if (save.dash.settled >= 3) return -1;
  save.dash.settled += 1;
  const gained = score >= 300 ? 8 : score >= 150 ? 3 : 0;
  save.dash.earned += gained;
  save.stars += gained;
  return gained;
}

/** 猜县：每日首次答对 +5 星（带 source 语义，标记独立于 Dash） */
export function claimQuizStar(save: RoomSave, now: number): boolean {
  const today = todayStr(now);
  if (save.quiz.date !== today) save.quiz = { date: today, claimed: false };
  if (save.quiz.claimed) return false;
  save.quiz.claimed = true;
  save.stars += QUIZ_STARS;
  return true;
}

export function buyFurniture(save: RoomSave, id: FurnitureId): boolean {
  const item = FURNITURE[id];
  if (!item || save.owned.includes(id) || save.stars < item.price) return false;
  save.stars -= item.price;
  save.owned.push(id);
  return true;
}

// 照顾动作（每日次数按本地日期重置）
function rollCare(save: RoomSave, now: number) {
  const today = todayStr(now);
  if (save.care.date !== today) save.care = { date: today, plays: 0, rests: 0 };
}

/** 投喂：消耗 1 点心，饱食 +30，亲密度 +2（恢复量 2026-11-17 按 GPT 玩法评审上调） */
export function feed(save: RoomSave): boolean {
  if (save.snacks <= 0) return false;
  save.snacks -= 1;
  save.satiety = Math.min(100, save.satiety + 30);
  save.intimacyXp += 2;
  return true;
}

/** 陪玩：心情 +20、精力 −5，每日 ≤3 次，亲密度 +2 */
export function playWith(save: RoomSave, now: number): boolean {
  rollCare(save, now);
  if (save.care.plays >= 3) return false;
  save.care.plays += 1;
  save.mood = Math.min(100, save.mood + 20);
  save.energy = Math.max(STATUS_FLOOR, save.energy - 5);
  save.intimacyXp += 2;
  return true;
}

/** 哄她休息：精力 +35，每日 ≤1 次，亲密度 +2 */
export function restHer(save: RoomSave, now: number): boolean {
  rollCare(save, now);
  if (save.care.rests >= 1) return false;
  save.care.rests += 1;
  save.energy = Math.min(100, save.energy + 35);
  save.intimacyXp += 2;
  return true;
}

/** 买点心：12 星 1 个（GPT 玩法评审：给点心一个稳定获取渠道，投喂才舍得用） */
export const SNACK_PRICE = 12;
export function buySnack(save: RoomSave): boolean {
  if (save.stars < SNACK_PRICE) return false;
  save.stars -= SNACK_PRICE;
  save.snacks += 1;
  return true;
}

// ----------------------------------------------------------- 每周小愿望（W5，GPT 评审定版）
// 每周（周一起）抽一个温柔的小约定：周内累计、只记成功动作、无惩罚无倒计时；
// 奖励 15 星 / 点心 ×1 二选一（防星星通胀）。计数纪律：陪玩/投喂只记成功；
// 浇水/进屋按日期去重；家具只记访客主动点触发并完成的互动（自动散步不算）。

export type WishId = "play" | "water" | "furniture" | "visit" | "feed" | "harvest";

export interface WishState {
  week: string; // 本周周一的本地日期
  id: WishId;
  progress: number;
  days: string[]; // water/visit 的已计数日期（去重用）
  done: boolean;
  claimed: boolean;
}

export const WISH_TARGETS: Record<WishId, number> = {
  play: 3,
  water: 4,
  furniture: 3,
  visit: 3,
  feed: 2,
  harvest: 1,
};
export const WISH_REWARD_STARS = 15;

export function weekKeyOf(now: number): string {
  const offset = (new Date(now).getDay() + 6) % 7; // 周一为一周开始
  return todayStr(now - offset * 24 * 3600 * 1000);
}

function gardenHasBloom(): boolean {
  try {
    const raw = localStorage.getItem("muse_garden_v1");
    if (!raw) return false;
    const g = JSON.parse(raw) as { pots?: ({ growthDays: number } | null)[] };
    return (g.pots ?? []).some((p) => p && p.growthDays >= 10);
  } catch {
    return false;
  }
}

/** 本周愿望不存在或已跨周时抽一个新的（愿望池按当前可完成条件过滤，避免抽到做不到的） */
export function ensureWish(save: RoomSave, now: number, rand: number): void {
  const week = weekKeyOf(now);
  if (save.wish && save.wish.week === week) return;
  const pool: WishId[] = ["play", "water", "visit"];
  if (save.owned.some((f) => FURNITURE[f]?.interactive)) pool.push("furniture");
  if (save.snacks >= 1) pool.push("feed");
  if (gardenHasBloom()) pool.push("harvest");
  const id = pool[Math.min(pool.length - 1, Math.floor(rand * pool.length))];
  save.wish = { week, id, progress: 0, days: [], done: false, claimed: false };
}

/** 记一次愿望进度：与本周愿望不符或已完成时不动；water/visit 按日期去重 */
export function applyWishAction(save: RoomSave, kind: WishId, now: number): void {
  const w = save.wish;
  if (!w || w.id !== kind || w.done) return;
  if (kind === "water" || kind === "visit") {
    const today = todayStr(now);
    if (w.days.includes(today)) return;
    w.days.push(today);
    w.progress = w.days.length;
  } else {
    w.progress += 1;
  }
  if (w.progress >= WISH_TARGETS[w.id]) {
    w.progress = WISH_TARGETS[w.id];
    w.done = true;
  }
}

/** 领取愿望奖励（15 星或点心 ×1，二选一，只能领一次） */
export function claimWish(save: RoomSave, choice: "stars" | "snack"): boolean {
  const w = save.wish;
  if (!w || !w.done || w.claimed) return false;
  w.claimed = true;
  if (choice === "stars") save.stars += WISH_REWARD_STARS;
  else save.snacks += 1;
  return true;
}

/** 亲密度等级：累计 xp 门槛（Lv.7 是园丁装里程碑，三期落地） */
export const INTIMACY_THRESHOLDS = [0, 10, 25, 45, 70, 100, 135, 175, 220, 270];
export function intimacyLevel(xp: number): number {
  let lv = 1;
  for (let i = 0; i < INTIMACY_THRESHOLDS.length; i++) {
    if (xp >= INTIMACY_THRESHOLDS[i]) lv = i + 1;
  }
  return lv;
}

/** 有效亲密度等级：站长模式下按满级 Lv.10 生效（只读覆盖，xp 本身不写）——
 *  供台词包/待机动作/主动搭话等按等级解锁的内容与展示层使用；
 *  升级检测仍走 intimacyLevel 本值，避免伪造升级横幅与回忆记录。 */
export function effectiveIntimacyLevel(save: RoomSave): number {
  return isOwnerMode() ? 10 : intimacyLevel(save.intimacyXp);
}

// ------------------------------------------------------- Furniture data

export interface FurnitureDef {
  id: FurnitureId;
  slot: SlotId;
  price: number;
  /** 是否有互动（绿植一期为纯装饰） */
  interactive: boolean;
  /** 资产来源（可追溯）：composite=合体图拆层；independent-base=单体独立生成（仅地毯特例：
      她坐姿遮挡的毯心无法从合体图还原，故按同一设计单独生成单体，人物层仍拆自合体图） */
  assetMode: "composite" | "independent-base";
  /** 互动持续 ms */
  duration: number;
  /** 互动一次的亲密度经验（完成时结算） */
  intimacyXp: number;
  /** 场景里的摆放（百分比坐标，针对 1920×1200 底板构图） */
  place: { cx: number; bottom: number; h: number };
  /** 她互动时的图层组合（同一画布坐标，见 muse-room 资产规范） */
  layers?: { alone: string[]; withHer: string[] };
  /** 走到哪个点开始互动（场景百分比坐标：x 中心、feet 落地线） */
  anchor: { x: number; feet: number };
}

const R = "/muse-room";
export const FURNITURE: Record<FurnitureId, FurnitureDef> = {
  rug: {
    id: "rug",
    assetMode: "independent-base",
    slot: "rug",
    price: 20,
    interactive: true,
    duration: 9000,
    intimacyXp: 1,
    place: { cx: 66, bottom: 99.3, h: 37 },
    layers: {
      alone: [`${R}/rug-solo.webp`],
      withHer: [`${R}/rug-solo.webp`, `${R}/rug-char.webp`],
    },
    anchor: { x: 64.5, feet: 97.9 },
  },
  bookshelf: {
    id: "bookshelf",
    assetMode: "composite",
    slot: "shelf",
    price: 40,
    interactive: true,
    duration: 8000,
    intimacyXp: 1,
    place: { cx: 15.5, bottom: 77.5, h: 43 },
    layers: {
      alone: [`${R}/shelf-back.webp`],
      withHer: [`${R}/shelf-back.webp`, `${R}/shelf-char.webp`],
    },
    anchor: { x: 22.7, feet: 77.2 },
  },
  desk: {
    id: "desk",
    assetMode: "composite",
    slot: "desk",
    price: 60,
    interactive: true,
    duration: 9000,
    intimacyXp: 1,
    place: { cx: 44, bottom: 84, h: 36 },
    layers: {
      alone: [`${R}/desk-alone.webp`],
      withHer: [`${R}/desk-char.webp`, `${R}/desk-front.webp`],
    },
    anchor: { x: 43.8, feet: 81.7 },
  },
  plant: {
    id: "plant",
    assetMode: "composite",
    slot: "corner",
    price: 30,
    interactive: false,
    duration: 0,
    intimacyXp: 0,
    place: { cx: 66.5, bottom: 77, h: 29 },
    layers: { alone: [`${R}/plant.webp`], withHer: [`${R}/plant.webp`] },
    anchor: { x: 66.5, feet: 76.5 },
  },
};

export const FURNITURE_ORDER: FurnitureId[] = ["rug", "bookshelf", "desk"];

// ------------------------------------------- 分时装互动人物层（2026-11-16 补齐）
// 其他时装的互动图：以默认装合体图为底只换装、只拆人物层，家具层与默认装共用
// 同一批文件——家具的外观与位置不随时装改变。文件：/muse-room/<时装>/<stem>-char.webp。
const CHAR_STEM: Partial<Record<FurnitureId, string>> = {
  rug: "rug",
  bookshelf: "shelf",
  desk: "desk",
};
const OUTFITS_WITH_ROOM_CHAR: ReadonlySet<string> = new Set([
  "sport",
  "school",
  "hakama",
  "travel",
  "gardener",
]);

/** 这套时装有没有这件家具的互动人物层（默认装用 FURNITURE 自带图层，恒有） */
export function hasRoomCharLayer(outfit: OutfitId, fid: FurnitureId): boolean {
  if (outfit === "default") return true;
  return OUTFITS_WITH_ROOM_CHAR.has(outfit) && CHAR_STEM[fid] !== undefined;
}

/** 她互动时的图层组：默认组合里以 -char.webp 结尾的就是人物层，按时装替换它，
    其余条目（家具层）原样共用——家具不动。 */
export function roomWithHerLayers(def: FurnitureDef, outfit: OutfitId): string[] {
  const base = def.layers?.withHer ?? [];
  if (outfit === "default" || !OUTFITS_WITH_ROOM_CHAR.has(outfit)) return base;
  const stem = CHAR_STEM[def.id];
  if (!stem) return base;
  const charPath = `${R}/${outfit}/${stem}-char.webp`;
  return base.map((p) => (p.endsWith("-char.webp") ? charPath : p));
}

// ------------------------------------------------------------- Activity

export type Activity = "idle" | "walk" | "interact" | "rest";

export type ActivityEvent =
  | { type: "timeout" }
  | { type: "arrived" }
  | { type: "finished" }
  | { type: "visitorTap"; furniture: FurnitureId | null }
  | { type: "careRest" };

/** 单一活动状态机（评审 P1）：转移规则集中在这里，组件只执行 */
export function transitionActivity(current: Activity, ev: ActivityEvent): Activity {
  switch (current) {
    case "idle":
      if (ev.type === "timeout") return "walk";
      if (ev.type === "visitorTap" && ev.furniture) return "walk";
      if (ev.type === "careRest") return "rest";
      return "idle";
    case "walk":
      if (ev.type === "arrived") return "interact";
      if (ev.type === "visitorTap") return "walk"; // 改道去新目标（组件更新目标点）
      return "walk";
    case "interact":
      if (ev.type === "finished") return "idle";
      if (ev.type === "visitorTap") return ev.furniture ? "walk" : "idle"; // 访客点别处：打断
      return "interact";
    case "rest":
      if (ev.type === "finished") return "idle";
      if (ev.type === "visitorTap") return "idle"; // 休息可被访客唤醒
      return "rest";
  }
}

/** 自动行为选择：精力太低优先去地毯休息；否则在已拥有的互动家具里挑一个 */
export function pickAutoTarget(
  save: RoomSave,
  rand: number,
): { furniture: FurnitureId | null; rest: boolean } {
  const ownedInteractive = FURNITURE_ORDER.filter(
    (id) => FURNITURE[id].interactive && save.owned.includes(id),
  );
  if (save.energy < 30 && save.owned.includes("rug")) {
    return { furniture: "rug", rest: true };
  }
  if (ownedInteractive.length === 0) return { furniture: null, rest: false };
  // 饱食太低时少出门活动，多数时间留在原地发呆（组件侧用 furniture=null 表示原地）
  if (save.satiety < 25 && rand < 0.5) return { furniture: null, rest: false };
  const idx = Math.min(ownedInteractive.length - 1, Math.floor(rand * ownedInteractive.length));
  return { furniture: ownedInteractive[idx], rest: false };
}

// ------------------------------------------------------------ Discovery

export type TimePeriod = "morning" | "day" | "evening" | "night";

export function timePeriodOf(d: Date): TimePeriod {
  const h = d.getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 17) return "day";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

export interface DiscoveryDef {
  id: string;
  when?: {
    furniture?: FurnitureId[];
    moodMin?: number;
    moodMax?: number;
    satietyMax?: number;
    intimacyMin?: number;
    periods?: TimePeriod[];
  };
}

/** 每日小发现的事件表（文案在 messages 的 Room.discovery.<id>，这里只放条件） */
export const DISCOVERIES: DiscoveryDef[] = [
  { id: "general1" },
  { id: "general2" },
  { id: "general3" },
  { id: "general4" },
  { id: "shelf1", when: { furniture: ["bookshelf"] } },
  { id: "desk1", when: { furniture: ["desk"] } },
  { id: "rug1", when: { furniture: ["rug"] } },
  { id: "plant1", when: { furniture: ["plant"] } },
  { id: "hungry1", when: { satietyMax: 35 } },
  { id: "happy1", when: { moodMin: 75 } },
  { id: "close1", when: { intimacyMin: 3 } },
  { id: "close2", when: { intimacyMin: 5 } },
  // Lv8 起的小发现：她开始分享小秘密（W3，文案经 GPT 评审）
  { id: "secret1", when: { intimacyMin: 8 } },
  { id: "secret2", when: { intimacyMin: 8 } },
  { id: "secret3", when: { intimacyMin: 8 } },
  { id: "secret4", when: { intimacyMin: 8 } },
  { id: "secret5", when: { intimacyMin: 8 } },
  { id: "secret6", when: { intimacyMin: 10 } },
];

function discoveryMatches(def: DiscoveryDef, save: RoomSave, period: TimePeriod): boolean {
  const w = def.when;
  if (!w) return true;
  if (w.furniture && !w.furniture.every((f) => save.owned.includes(f))) return false;
  if (w.moodMin !== undefined && save.mood < w.moodMin) return false;
  if (w.moodMax !== undefined && save.mood > w.moodMax) return false;
  if (w.satietyMax !== undefined && save.satiety > w.satietyMax) return false;
  if (w.intimacyMin !== undefined && intimacyLevel(save.intimacyXp) < w.intimacyMin) return false;
  if (w.periods && !w.periods.includes(period)) return false;
  return true;
}

/** 今日小发现：每天定一条存下来，刷新不变（评审定版） */
export function pickDiscovery(save: RoomSave, now: number, rand: number): string | null {
  const today = todayStr(now);
  if (save.discovery.date === today) return save.discovery.id;
  const period = timePeriodOf(new Date(now));
  const pool = DISCOVERIES.filter((d) => discoveryMatches(d, save, period));
  if (pool.length === 0) return null;
  const picked = pool[Math.min(pool.length - 1, Math.floor(rand * pool.length))];
  save.discovery = { date: today, id: picked.id };
  save.intimacyXp += 1;
  return picked.id;
}
