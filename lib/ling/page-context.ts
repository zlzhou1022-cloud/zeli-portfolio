import { getAllTrips, getTripById } from "@/lib/travel-data";
import cnMessages from "@/messages/cn.json";
import jpMessages from "@/messages/jp.json";
import enMessages from "@/messages/en.json";
import type { LingLocale } from "./knowledge";
import type { PageInfo } from "@/lib/page-guide";

// 页面感知二期：把访客「当前正在看的页面」拼成一小段上下文，追加到系统
// 提示词末尾（不进 messages，因此不落库、不改变 chat_logs 形状）。
// 基础事实区本来就含全部照片说明，这里只补它没有的东西：当前页是哪页、
// 相册详情页当前打开的是第几张，以及「这张照片/这一页」的指代锚点。
// 输入来自前端请求体，必须按不可信输入校验：kind 白名单、trip 必须真实
// 存在、photo 钳制在 [1, 张数]，不合格一律返回空串（等同没有页面上下文）。

type MessagesShape = typeof cnMessages;

const MESSAGES: Record<LingLocale, MessagesShape> = {
  cn: cnMessages as MessagesShape,
  jp: jpMessages as unknown as MessagesShape,
  en: enMessages as unknown as MessagesShape,
};

const TEXT: Record<
  LingLocale,
  {
    heading: string;
    home: string;
    profile: string;
    lab: string;
    guestbook: string;
    travels: (tripsList: string) => string;
    trip: (title: string, date: string, total: number) => string;
    currentPhoto: (n: number, caption: string) => string;
    rule: string;
  }
> = {
  cn: {
    heading: "## 访客当前页面",
    home: "访客此刻正在看：首页（有通往履历、实验室、旅行相册和留言板的卡片与菜单）。",
    profile: "访客此刻正在看：个人主页（履历）页面。",
    lab: "访客此刻正在看：实验室与插件页面。",
    guestbook: "访客此刻正在看：留言板页面。",
    travels: (list) => `访客此刻正在看：旅行相册列表页。本站的游记有：${list}。`,
    trip: (title, date, total) =>
      `访客此刻正在看：游记《${title}》（${date}，共 ${total} 张照片）。`,
    currentPhoto: (n, caption) => `当前打开的是第 ${n} 张，页面上给这张写的说明是：「${caption}」。`,
    rule: "访客说「这张照片」「这一页」「这里」时，指的就是上面这个页面/这张照片。回答请依据页面说明与事实区，不要编造说明之外的画面细节。",
  },
  jp: {
    heading: "## 訪問者が今見ているページ",
    home: "訪問者は今、ホームページを見ています（プロフィール・ラボ・旅行アルバム・ゲストブックへのカードとメニューがあります）。",
    profile: "訪問者は今、プロフィール（経歴）のページを見ています。",
    lab: "訪問者は今、ラボ（実験とプラグイン）のページを見ています。",
    guestbook: "訪問者は今、ゲストブックのページを見ています。",
    travels: (list) => `訪問者は今、旅行アルバムの一覧ページを見ています。このサイトの旅行記：${list}。`,
    trip: (title, date, total) =>
      `訪問者は今、旅行記『${title}』（${date}、全${total}枚）を見ています。`,
    currentPhoto: (n, caption) => `現在開いているのは ${n} 枚目で、ページに書かれた説明は「${caption}」です。`,
    rule: "訪問者が「この写真」「このページ」「ここ」と言ったら、上記のページ／写真のことです。ページの説明と事実セクションに基づいて答え、説明にない画面の細部を捏造しないでください。",
  },
  en: {
    heading: "## Page the visitor is currently viewing",
    home: "The visitor is currently on the home page (with cards and menu links to the profile, lab, travel albums, and guestbook).",
    profile: "The visitor is currently on the profile (resume) page.",
    lab: "The visitor is currently on the Lab & Plugins page.",
    guestbook: "The visitor is currently on the guestbook page.",
    travels: (list) => `The visitor is currently on the travel album list page. The site's travel stories are: ${list}.`,
    trip: (title, date, total) =>
      `The visitor is currently viewing the travel story "${title}" (${date}, ${total} photos).`,
    currentPhoto: (n, caption) => `The photo currently open is #${n}, whose caption on the page reads: "${caption}".`,
    rule: "When the visitor says \"this photo\", \"this page\", or \"here\", they mean the page/photo above. Answer from the page captions and the facts section; do not invent visual details beyond the captions.",
  },
};

const KINDS = ["home", "profile", "lab", "travels", "trip", "guestbook"] as const;

export function buildPageContext(locale: LingLocale, raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const page = raw as Partial<PageInfo>;
  if (!KINDS.includes(page.kind as (typeof KINDS)[number])) return "";
  const tx = TEXT[locale];
  const m = MESSAGES[locale];
  const lines = [tx.heading];

  switch (page.kind) {
    case "home":
      lines.push(tx.home);
      break;
    case "profile":
      lines.push(tx.profile);
      break;
    case "lab":
      lines.push(tx.lab);
      break;
    case "guestbook":
      lines.push(tx.guestbook);
      break;
    case "travels": {
      const list = getAllTrips()
        .map((trip) => {
          const t = m.Trips[trip.id as keyof typeof m.Trips] as
            | { title: string }
            | undefined;
          return t ? `${t.title}（${trip.date}）` : null;
        })
        .filter(Boolean)
        .join("；");
      lines.push(tx.travels(list));
      break;
    }
    case "trip": {
      if (typeof page.tripId !== "string") return "";
      const trip = getTripById(page.tripId);
      if (!trip) return "";
      const t = m.Trips[trip.id as keyof typeof m.Trips] as
        | { title: string; photos: Record<string, string> }
        | undefined;
      if (!t) return "";
      lines.push(tx.trip(t.title, trip.date, trip.photos.length));
      const n = Math.min(
        Math.max(1, Math.floor(typeof page.photo === "number" ? page.photo : 1)),
        trip.photos.length,
      );
      const caption = t.photos[String(n)];
      if (caption) lines.push(tx.currentPhoto(n, caption));
      break;
    }
  }

  lines.push(tx.rule);
  return lines.join("\n");
}
