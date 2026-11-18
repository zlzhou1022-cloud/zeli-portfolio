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
    games: string;
    room: string;
    garden: string;
    guestbook: string;
    travels: (tripsList: string) => string;
    trip: (title: string, date: string, total: number) => string;
    currentPhoto: (n: number, caption: string) => string;
    rule: string;
  }
> = {
  cn: {
    heading: "## 访客当前页面",
    home: "访客此刻正在看：首页（有通往履历、实验室、旅行相册、小游戏专区和留言板的卡片与菜单）。",
    profile: "访客此刻正在看：个人主页（履历）页面。",
    lab: "访客此刻正在看：实验室与插件页面。",
    games: "访客此刻正在看：小游戏专区页面（有和慕斯一起玩的两个小游戏：45 秒向上冲、看图猜县集章，还有慕斯的小屋）。",
    room: "访客此刻正在看：慕斯的小屋页面（用星星给她买家具的养成页：每日签到、照顾她的饱食/心情/精力、看她在房间里散步和用家具；星星来自签到和两个小游戏）。",
    garden: "访客此刻正在看：慕斯的室内花园页面（从小屋花架点进来的种花页：买种子、种下、每天浇水推进生长、开花后收获换星星并收进图鉴；累计收获 6 朵可解锁园丁装）。",
    guestbook: "访客此刻正在看：留言板页面。",
    travels: (list) => `访客此刻正在看：旅行相册列表页。本站的游记有：${list}。`,
    trip: (title, date, total) =>
      `访客此刻正在看：游记《${title}》（${date}，共 ${total} 张照片）。`,
    currentPhoto: (n, caption) => `当前打开的是第 ${n} 张，页面上给这张写的说明是：「${caption}」。`,
    rule: "访客说「这张照片」「这一页」「这里」时，指的就是上面这个页面/这张照片。回答请依据页面说明与事实区，不要编造说明之外的画面细节。访客明确换了话题时，不要再硬套当前页面；当前页面信息不足以回答时，先用 get_trip_detail 等工具核实再答。判断优先级：访客这句话里明确说的对象 > 当前页面 > 之前的对话。",
  },
  jp: {
    heading: "## 訪問者が今見ているページ",
    home: "訪問者は今、ホームページを見ています（プロフィール・ラボ・旅行アルバム・ゲームコーナー・ゲストブックへのカードとメニューがあります）。",
    profile: "訪問者は今、プロフィール（経歴）のページを見ています。",
    lab: "訪問者は今、ラボ（実験とプラグイン）のページを見ています。",
    games: "訪問者は今、ゲームコーナーのページを見ています（ムースと遊ぶ45秒ダッシュと県当てクイズ、ムースの小屋があります）。",
    room: "訪問者は今、ムースの小屋のページを見ています（星で家具を買う育成ページ：毎日のチェックイン、おなか・ごきげん・元気のお世話、部屋を歩き回る彼女の様子。星はチェックインと2つのミニゲームで集めます）。",
    garden: "訪問者は今、ムースの室内ガーデンのページを見ています（小屋の花台から入る種まきページ：種を買って植え、毎日の水やりで育て、咲いたら収穫して星と図鑑に。累計6株の収穫でガーデナー衣装が解放されます）。",
    guestbook: "訪問者は今、ゲストブックのページを見ています。",
    travels: (list) => `訪問者は今、旅行アルバムの一覧ページを見ています。このサイトの旅行記：${list}。`,
    trip: (title, date, total) =>
      `訪問者は今、旅行記『${title}』（${date}、全${total}枚）を見ています。`,
    currentPhoto: (n, caption) => `現在開いているのは ${n} 枚目で、ページに書かれた説明は「${caption}」です。`,
    rule: "訪問者が「この写真」「このページ」「ここ」と言ったら、上記のページ／写真のことです。ページの説明と事実セクションに基づいて答え、説明にない画面の細部を捏造しないでください。訪問者が明確に話題を変えたら、現在のページに無理に結びつけないでください。現在のページの情報だけでは答えられない場合は、get_trip_detail などのツールで確認してから答えてください。優先順位は、今の発言で明示された対象 > 現在のページ > それまでの会話、です。",
  },
  en: {
    heading: "## Page the visitor is currently viewing",
    home: "The visitor is currently on the home page (with cards and menu links to the profile, lab, travel albums, games corner, and guestbook).",
    profile: "The visitor is currently on the profile (resume) page.",
    lab: "The visitor is currently on the Lab & Plugins page.",
    games: "The visitor is currently on the Mini Games page (games played with Mousse: the 45-second dash, the prefecture quiz, and Mousse's Room).",
    room: "The visitor is currently on Mousse's Room page (a care page where stars buy her furniture: daily check-ins, looking after her fullness/mood/energy, and watching her wander and use the furniture; stars come from check-ins and the two mini games).",
    garden: "The visitor is currently on Mousse's Indoor Garden page (reached from the flower stand in her room: buy seeds, plant them, water daily to grow, harvest blooms for stars and the album; 6 lifetime harvests unlock the gardener outfit).",
    guestbook: "The visitor is currently on the guestbook page.",
    travels: (list) => `The visitor is currently on the travel album list page. The site's travel stories are: ${list}.`,
    trip: (title, date, total) =>
      `The visitor is currently viewing the travel story "${title}" (${date}, ${total} photos).`,
    currentPhoto: (n, caption) => `The photo currently open is #${n}, whose caption on the page reads: "${caption}".`,
    rule: "When the visitor says \"this photo\", \"this page\", or \"here\", they mean the page/photo above. Answer from the page captions and the facts section; do not invent visual details beyond the captions. If the visitor clearly changes the topic, drop the current-page anchor instead of forcing a connection. If the current page's information is not enough to answer, verify with tools such as get_trip_detail first. Priority: what the visitor explicitly names in this message > the current page > earlier conversation.",
  },
};

const KINDS = ["home", "profile", "lab", "games", "room", "garden", "travels", "trip", "guestbook"] as const;

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
    case "games":
      lines.push(tx.games);
      break;
    case "room":
      lines.push(tx.room);
      break;
    case "garden":
      lines.push(tx.garden);
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
