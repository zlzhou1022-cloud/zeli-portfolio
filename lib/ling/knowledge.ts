import { getAllProjects } from "@/lib/lab-data";
import { getAllTrips } from "@/lib/travel-data";
import { getPrefecture } from "@/lib/prefectures";
import cnMessages from "@/messages/cn.json";
import jpMessages from "@/messages/jp.json";
import enMessages from "@/messages/en.json";

export type LingLocale = "cn" | "jp" | "en";

export const LING_LOCALES: LingLocale[] = ["cn", "jp", "en"];

export function isLingLocale(v: unknown): v is LingLocale {
  return v === "cn" || v === "jp" || v === "en";
}

// 披露白名单（硬约束）：本文件只读取 messages/{cn,jp,en}.json 的
// Home / ProfilePage / Projects / Trips 四个命名空间，以及
// lib/lab-data.ts、lib/travel-data.ts 的结构字段。
// 不得引入其他数据源（所属本部、出向安排、客户名称等一律不在白名单内）。
type MessagesShape = typeof cnMessages;

const MESSAGES: Record<LingLocale, MessagesShape> = {
  cn: cnMessages as MessagesShape,
  jp: jpMessages as unknown as MessagesShape,
  en: enMessages as unknown as MessagesShape,
};

const HEADINGS: Record<
  LingLocale,
  { author: string; career: string; education: string; projects: string; trips: string; pages: string; thesis: string; photosUnit: string; morePhotos: string }
> = {
  cn: { author: "作者", career: "职业经历", education: "教育背景", projects: "实验室项目", trips: "旅行游记", pages: "站内页面", thesis: "毕业论文", photosUnit: "张照片", morePhotos: "等" },
  jp: { author: "著者", career: "職務経歴", education: "学歴", projects: "ラボのプロジェクト", trips: "旅行記", pages: "サイト内のページ", thesis: "論文", photosUnit: "枚の写真", morePhotos: "など" },
  en: { author: "Author", career: "Career", education: "Education", projects: "Lab Projects", trips: "Travel Stories", pages: "Site Pages", thesis: "Thesis", photosUnit: "photos", morePhotos: "and more" },
};

// 站内各页面的真实内容（站长 2026-11-19 追加）：此前事实区没有小屋/花园等页面的
// 内容，模型被问「小屋里有什么」时凭空编了留言、相册精选、小工具。介绍页面内容
// 只能以这里为准（提示词边界一节有硬约束）。页面功能变了记得同步改这里。
const PAGE_CONTENTS: Record<LingLocale, string[]> = {
  cn: [
    "首页：Zeli 的自我介绍与各栏目入口",
    "个人主页：教育背景与职场履历",
    "实验室与插件：Zeli 做的工程小实验与工具（具体条目见「实验室项目」）",
    "留言板：访客留言、看大家留言的地方",
    "小游戏专区：小游戏的集合页，入口有向上冲、看图猜县、慕斯的小屋、慕斯的花园",
    "向上冲（Muse Dash）：控制慕斯向上跑、收集数据、躲开病毒的小游戏",
    "看图猜县：看 Zeli 的旅行照片，猜照片是在哪个县拍的问答游戏",
    "慕斯的小屋：慕斯住的小屋——陪她说话、喂点心、每日签到、给她换装、用星星买家具（地毯、书架、书桌）布置房间；点屋里的花架可以去她的花园",
    "慕斯的花园：她的室内花园——买种子种花、每天浇水、花开后收获攒星星",
  ],
  jp: [
    "ホーム：Zeli の自己紹介と各コーナーへの入口",
    "プロフィール：学歴と職務経歴",
    "ラボ：Zeli が作った小さな実験とツール（詳細は「ラボのプロジェクト」）",
    "ゲストブック：訪問者がメッセージを残したり、みんなのメッセージを読んだりする場所",
    "ミニゲーム：ゲームの入口ページ。「上にダッシュ」「写真で県当てクイズ」「ムースのお部屋」「ムースのガーデン」があります",
    "上にダッシュ（Muse Dash）：ムースを操作して上へ走り、データを集めてウイルスを避けるゲーム",
    "写真で県当てクイズ：Zeli の旅行写真を見て、撮った県を当てるクイズ",
    "ムースのお部屋：ムースが暮らす部屋——お話し、おやつ、毎日のチェックイン、着せ替え、スターで家具（ラグ・本棚・机）を買って模様替えができます。部屋のフラワースタンドから彼女のガーデンへ行けます",
    "ムースのガーデン：彼女の室内ガーデン——種を買って植え、毎日水やりをして、花が咲いたら収穫してスターを貯めます",
  ],
  en: [
    "Home: Zeli's intro and the entry points to every section",
    "Profile: education and career history",
    "Lab: Zeli's small engineering experiments and tools (see Lab Projects for details)",
    "Guestbook: where visitors leave and read messages",
    "Games: the games hub — Muse Dash, the Prefecture Quiz, Mousse's Room, and Mousse's Garden",
    "Muse Dash: a runner game where you guide Mousse upward, collecting data and dodging viruses",
    "Prefecture Quiz: guess which prefecture each of Zeli's travel photos was taken in",
    "Mousse's Room: where Mousse lives — chat with her, feed her snacks, check in daily, change her outfits, and buy furniture (rug, bookshelf, desk) with stars to decorate the room; the flower stand in the room leads to her garden",
    "Mousse's Garden: her indoor garden — buy seeds, plant them, water daily, and harvest blooms for stars",
  ],
};

// 本站技术栈（公开信息：仓库本身就是 public）。访客问技术实现时以此为准，
// 避免模型凭印象编造（如体检 G4.5 曾误答 GitHub Pages 静态站）。
const SITE_TECH: Record<LingLocale, string> = {
  cn: "本站技术：Next.js + React 构建，部署于 Vercel，源码公开在 GitHub（github.com/zlzhou1022-cloud/zeli-portfolio）",
  jp: "このサイトの技術：Next.js + React で構築し、Vercel にデプロイ。ソースコードは GitHub で公開（github.com/zlzhou1022-cloud/zeli-portfolio）",
  en: "This site: built with Next.js + React, deployed on Vercel; source code is public on GitHub (github.com/zlzhou1022-cloud/zeli-portfolio)",
};

// 摄影器材。此前这条事实只出现在 few-shot 示例的回答里，模型在游记语境下
// 检索不到、误答「没有提到相机型号」（体检 G7.4），故提升为作者区正式事实。
const CAMERA_GEAR: Record<LingLocale, string> = {
  cn: "摄影器材：旅行照片主要使用 Fujifilm X-S20 拍摄",
  jp: "撮影機材：旅行写真は主に Fujifilm X-S20 で撮影",
  en: "Camera gear: travel photos are mainly shot on a Fujifilm X-S20",
};

// 旅行覆盖事实（站长 2026-11-19 追加）：47 县全部去过，但有照片的只有一部分县。
// 有照片的县名单按 travel-data 动态生成，新增旅程自动扩容，不要写死。
const TRAVEL_COVERAGE: Record<LingLocale, (n: number, names: string) => string> = {
  cn: (n, names) =>
    `旅行覆盖：Zeli 已走遍日本全部 47 个都道府县（47 个县全部去过）。但本站相册目前只收录了其中 ${n} 个县的照片：${names}。访客问「去过 X 县吗」——去过；问「有 X 县的照片或游记吗」——只有上述县有，其余县暂未收录，不要编造不存在的照片或游记。`,
  jp: (n, names) =>
    `旅行カバー範囲：Zeli は日本の47都道府県をすべて訪れています。ただし本サイトのアルバムに写真があるのは現在のところ次の ${n} 県だけです：${names}。「X 県に行ったことがありますか」と聞かれたら、行ったことがあると答えてください。「X 県の写真や旅行記はありますか」と聞かれたら、上記の県のみで、それ以外は未収録です。存在しない写真や旅行記を捏造しないでください。`,
  en: (n, names) =>
    `Travel coverage: Zeli has visited all 47 prefectures of Japan. However, the albums on this site currently include photos from only these ${n} prefectures: ${names}. If a visitor asks "Has he been to prefecture X?" — yes, he has been to all 47. If they ask "Are there photos or a story from prefecture X?" — only the prefectures listed above have any; do not invent photos or stories that do not exist.`,
};

// 输出体积守卫：超过此长度时逐图说明降级（见 buildKnowledge）。
const MAX_KNOWLEDGE_CHARS = 6000;

// 逐图说明降级等级：0=全量，1=每辑 4 张，2=每辑 2 张，3=不带说明（仅索引）。
// 分区预算（2026-11-19 与 ChatGPT 讨论后定）：作者/履历/页面/旅行覆盖等核心事实
// 与游记索引（标题/日期/张数）永不截断，只有逐图说明分级降级——旧实现只有
// 「全量→每辑4张」两档，游记一多就跳崖，现在改成四档平滑降级。
type CaptionLevel = 0 | 1 | 2 | 3;
const CAPTION_LIMITS: Record<CaptionLevel, number> = { 0: Infinity, 1: 4, 2: 2, 3: 0 };

function buildKnowledgeInner(locale: LingLocale, captionLevel: CaptionLevel): string {
  const m = MESSAGES[locale];
  const h = HEADINGS[locale];
  const p = m.ProfilePage;
  const lines: string[] = [];

  lines.push(`## ${h.author}`);
  lines.push(`- Zeli Zhou（${p.role}）`);
  lines.push(`- ${m.Home.bio}`);
  // 邮箱是 Profile 页公开信息，仅在事实区列出；提示词规定仅在访客明确询问联系方式时给出。
  lines.push(`- Email: zlzhou1022@gmail.com`);
  lines.push(`- ${SITE_TECH[locale]}`);
  lines.push(`- ${CAMERA_GEAR[locale]}`);

  lines.push(`## ${h.career}`);
  lines.push(`- ${p.mri.name}｜${p.mri.title}｜${p.mri.date}｜${p.mri.desc}`);
  lines.push(`- ${p.deloitte.name}｜${p.deloitte.title}｜${p.deloitte.date}｜${p.deloitte.desc}`);

  lines.push(`## ${h.education}`);
  lines.push(`- ${p.utokyo.name}｜${p.utokyo.degree}｜${p.utokyo.date}｜${h.thesis}: ${p.utokyo.thesis_title}`);
  lines.push(`- ${p.whu.name}｜${p.whu.degree}｜${p.whu.date}｜${h.thesis}: ${p.whu.thesis_title}`);

  lines.push(`## ${h.projects}`);
  for (const project of getAllProjects()) {
    const t = m.Projects[project.id as keyof typeof m.Projects] as
      | { title: string; description: string }
      | undefined;
    if (!t) continue;
    lines.push(`- ${t.title}（id: ${project.id}）｜${t.description}｜Tags: ${project.tags.join(", ")}｜URL: ${project.url}`);
  }

  lines.push(`## ${h.pages}`);
  for (const pageLine of PAGE_CONTENTS[locale]) {
    lines.push(`- ${pageLine}`);
  }

  lines.push(`## ${h.trips}`);
  const photoPrefIds = [...new Set(getAllTrips().flatMap((tr) => tr.photos.map((p) => p.prefecture)))];
  const photoPrefNames = photoPrefIds
    .map((id) => getPrefecture(id)?.[locale] ?? id)
    .join(locale === "en" ? ", " : "、");
  lines.push(`- ${TRAVEL_COVERAGE[locale](photoPrefIds.length, photoPrefNames)}`);
  for (const trip of getAllTrips()) {
    const t = m.Trips[trip.id as keyof typeof m.Trips] as
      | { title: string; photos: Record<string, string> }
      | undefined;
    if (!t) continue;
    const total = trip.photos.length;
    lines.push(`- ${t.title}（id: ${trip.id}）｜${trip.date}｜${total} ${h.photosUnit}`);
    const captions = trip.photos.map((_, i) => t.photos[String(i + 1)]).filter(Boolean);
    // 逐图说明只是背景索引：访客问某辑细节时她有 get_trip_detail 工具现查，
    // 常驻提示词里的说明按上面的等级降级，索引行（标题/日期/张数）永不丢。
    const shown = captions.slice(0, CAPTION_LIMITS[captionLevel]);
    shown.forEach((caption, i) => {
      // 带上 travel-data 的短关键词（如「睡魔面部」「生剥鬼下山」），帮模型把照片与祭典/地点对准，避免混淆相近条目。
      const keyword = trip.photos[i]?.desc;
      lines.push(keyword ? `  ${i + 1}. 【${keyword}】${caption}` : `  ${i + 1}. ${caption}`);
    });
    if (captions.length > shown.length) {
      lines.push(`  …${h.morePhotos}（${total} ${h.photosUnit}）`);
    }
  }

  return lines.join("\n");
}

export function buildKnowledge(locale: LingLocale): string {
  // v2.6 瘦身（2026-11-19）：常驻说明默认从 2 张/辑起（原 0=全量）。理由：
  // 全量 35 条说明约 1300 字 ≈ 800 词元，而游记细节类问题按 TOOLS_GUIDE 本来
  // 就走 get_trip_detail / search_photos 现查同一批数据，常驻全量是双份付费；
  // 每辑留 2 张保留「这辑大概拍了什么」的手感，细节精度由工具保证。
  for (const level of [2, 3] as CaptionLevel[]) {
    const built = buildKnowledgeInner(locale, level);
    if (built.length <= MAX_KNOWLEDGE_CHARS) return built;
  }
  // 连「仅索引」都超限 = 核心事实本身太长，必须人工精简（与 ChatGPT 讨论定的断言）。
  // 线上不抛错断聊（保可用性），但留一条醒目错误日志，审计脚本也会拦住。
  const indexOnly = buildKnowledgeInner(locale, 3);
  console.error(
    `[ling] knowledge for ${locale} is ${indexOnly.length} chars at index-only level (max ${MAX_KNOWLEDGE_CHARS}). Core facts must be trimmed manually.`
  );
  return indexOnly;
}
