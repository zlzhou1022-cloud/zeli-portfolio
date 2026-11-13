// 页面感知：把当前 URL 解析成「访客正在看哪个页面」，桌宠台词与聊天窗的
// 页面上下文共用。相册详情页按查询参数 p 分页渲染（一次显示一张），当前
// 照片就在 URL 里，不需要额外的事件上报。
export type PageKind =
  | "home"
  | "profile"
  | "lab"
  | "travels"
  | "trip"
  | "guestbook"
  | "other";

export interface PageInfo {
  kind: PageKind;
  tripId?: string;
  photo?: number; // 1 起，仅 trip 有
}

const LOCALES = ["cn", "jp", "en"];

export function parsePage(pathname: string, search: string): PageInfo {
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length && LOCALES.includes(segs[0])) segs.shift();
  if (segs.length === 0) return { kind: "home" };
  if (segs[0] === "profile") return { kind: "profile" };
  if (segs[0] === "lab") return { kind: "lab" };
  if (segs[0] === "guestbook") return { kind: "guestbook" };
  if (segs[0] === "travels") {
    if (segs[1]) {
      const p = parseInt(new URLSearchParams(search).get("p") || "1", 10);
      return {
        kind: "trip",
        tripId: segs[1],
        photo: Number.isFinite(p) && p >= 1 ? p : 1,
      };
    }
    return { kind: "travels" };
  }
  return { kind: "other" };
}

// 同一页面只自动介绍一次的去重键（照片翻页不算新页面）
export function pageKey(info: PageInfo): string {
  return info.kind === "trip" ? `trip:${info.tripId}` : info.kind;
}
