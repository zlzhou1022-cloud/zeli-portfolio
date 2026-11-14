// 慕斯时装库（站长 2026-11-14 需求，解锁条件同日改版定版）：
// 套装靠成就解锁，全部状态存访客浏览器 localStorage（与集章/最高分同机制），
// 无账号、无后端。解锁不单独存，每次现算：
// - 默认装：进站即拥有
// - 运动装：「慕斯向前冲」单局最高分（ling_game_best）≥ 300
// - 学生制服：猜县游戏答对过 ≥1 个县（muse_quiz_correct 标记，或已有 ≥1 枚章）
// - 和风袴装：在留言板成功留言一次（muse_guestbook_posted 标记）
// - 旅行装：集章（muse_stamps）满 47/47
// 当前穿着存 muse_outfit；失效（未解锁/数据被清）时自动回落默认装。
// 姿势图按套装分目录：默认装在 /muse-pet/ 根下，其余在 /muse-pet/<套装>/
// 同名文件。某套图还没做完时 OUTFIT_READY 不含它——面板里显示「准备中」，
// 即使已解锁也不能选（避免选了个空壳）。图齐一套、READY 加一套。

export type OutfitId = "default" | "sport" | "school" | "hakama" | "travel";

export type PoseName =
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
  | "peekBottom"
  | "runLeft"
  | "runRight";

export const POSE_FILES: Record<PoseName, string> = {
  look: "look.webp",
  book: "book.webp",
  letter: "letter.webp",
  smell: "smell.webp",
  wave: "wave.webp",
  wink: "wink.webp",
  stareyes: "stareyes.webp",
  scratch: "scratch.webp",
  sorry: "sorry.webp",
  present: "present.webp",
  lifted: "lifted.webp",
  doze: "doze.webp",
  peekSide: "peek-side.webp",
  peekSideR: "peek-side-r.webp",
  peekBottom: "peek-bottom.webp",
  runLeft: "run-left.webp",
  runRight: "run-right.webp",
};

export const OUTFIT_ORDER: OutfitId[] = ["default", "sport", "school", "hakama", "travel"];

// 已备齐全套姿势图、可以真正穿上的套装（图齐一套加一套）
export const OUTFIT_READY: OutfitId[] = ["default", "sport", "school"];

const OUTFIT_KEY = "muse_outfit";
const BEST_KEY = "ling_game_best";
const STAMPS_KEY = "muse_stamps";
const QUIZ_CORRECT_KEY = "muse_quiz_correct";
const GUESTBOOK_KEY = "muse_guestbook_posted";
const TOASTED_PREFIX = "muse_toasted_";

export const SPORT_UNLOCK_SCORE = 300;
export const TRAVEL_UNLOCK_STAMPS = 47;

export function poseSrc(outfit: OutfitId, pose: PoseName): string {
  const file = POSE_FILES[pose];
  return outfit === "default" ? `/muse-pet/${file}` : `/muse-pet/${outfit}/${file}`;
}

function readStamps(): string[] {
  try {
    const raw = localStorage.getItem(STAMPS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export interface OutfitProgress {
  /** 当前进度数值（分数/章数），无进度概念的套装为 null */
  value: number | null;
  /** 解锁所需数值 */
  target: number | null;
}

/** 每套的解锁判定 + 进度（判定逻辑的唯一出处，面板/提示都读这里） */
export function outfitStatus(id: OutfitId): { unlocked: boolean; progress: OutfitProgress } {
  if (typeof window === "undefined") return { unlocked: id === "default", progress: { value: null, target: null } };
  switch (id) {
    case "default":
      return { unlocked: true, progress: { value: null, target: null } };
    case "sport": {
      const best = readBest();
      return { unlocked: best >= SPORT_UNLOCK_SCORE, progress: { value: best, target: SPORT_UNLOCK_SCORE } };
    }
    case "school": {
      const stamps = readStamps().length;
      return {
        unlocked: stamps >= 1 || readFlag(QUIZ_CORRECT_KEY),
        progress: { value: Math.min(stamps, 1), target: 1 },
      };
    }
    case "hakama":
      return { unlocked: readFlag(GUESTBOOK_KEY), progress: { value: null, target: null } };
    case "travel": {
      const stamps = readStamps().length;
      return { unlocked: stamps >= TRAVEL_UNLOCK_STAMPS, progress: { value: stamps, target: TRAVEL_UNLOCK_STAMPS } };
    }
  }
}

export function getUnlockedOutfits(): OutfitId[] {
  return OUTFIT_ORDER.filter((id) => outfitStatus(id).unlocked);
}

/** 当前穿着：存的选择仍有效（已解锁且图已备齐）才算数，否则回落默认装 */
export function getCurrentOutfit(): OutfitId {
  if (typeof window === "undefined") return "default";
  try {
    const saved = localStorage.getItem(OUTFIT_KEY) as OutfitId | null;
    if (saved && OUTFIT_ORDER.includes(saved) && OUTFIT_READY.includes(saved) && outfitStatus(saved).unlocked) {
      return saved;
    }
  } catch {
    /* 读不到就默认装 */
  }
  return "default";
}

export function setCurrentOutfit(id: OutfitId) {
  try {
    localStorage.setItem(OUTFIT_KEY, id);
  } catch {
    /* 存不下就算了 */
  }
  window.dispatchEvent(new CustomEvent("muse:outfit-changed"));
}

/** 猜县第一次答对时由猜县组件调用 */
export function markQuizCorrect() {
  try {
    localStorage.setItem(QUIZ_CORRECT_KEY, "1");
  } catch {
    /* 存不下就算了 */
  }
  notifyProgress();
}

/** 留言板留言成功时由留言板组件调用 */
export function markGuestbookPosted() {
  try {
    localStorage.setItem(GUESTBOOK_KEY, "1");
  } catch {
    /* 存不下就算了 */
  }
  notifyProgress();
}

/** 成就数据有变化时通知桌宠检查新解锁（解锁提示） */
export function notifyProgress() {
  window.dispatchEvent(new CustomEvent("muse:progress"));
}

const OUTFIT_CHANGED_EVENT = "muse:outfit-changed";
const PROGRESS_EVENT = "muse:progress";
export { OUTFIT_CHANGED_EVENT, PROGRESS_EVENT };

/** 解锁提示只弹一次：弹过记标记 */
export function wasToasted(id: OutfitId): boolean {
  return readFlag(TOASTED_PREFIX + id);
}

export function markToasted(id: OutfitId) {
  try {
    localStorage.setItem(TOASTED_PREFIX + id, "1");
  } catch {
    /* 存不下就算了 */
  }
}

/**
 * 拖动态的放大倍数（按身体占图高比例逐套校准）：默认装 lifted 图里兜帽被
 * 拉成一束、身体只占约 70%，故 1.43；其余套装被提溜图身体基本满图，先记
 * 1.0，实图出来后再按实测调。
 */
export const OUTFIT_LIFT_SCALE: Record<OutfitId, number> = {
  default: 1.43,
  sport: 1.0,
  school: 1.09,
  hakama: 1.0,
  travel: 1.0,
};
