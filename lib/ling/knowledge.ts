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
  { author: string; career: string; education: string; projects: string; trips: string; thesis: string; photosUnit: string; morePhotos: string }
> = {
  cn: { author: "作者", career: "职业经历", education: "教育背景", projects: "实验室项目", trips: "旅行游记", thesis: "毕业论文", photosUnit: "张照片", morePhotos: "等" },
  jp: { author: "著者", career: "職務経歴", education: "学歴", projects: "ラボのプロジェクト", trips: "旅行記", thesis: "論文", photosUnit: "枚の写真", morePhotos: "など" },
  en: { author: "Author", career: "Career", education: "Education", projects: "Lab Projects", trips: "Travel Stories", thesis: "Thesis", photosUnit: "photos", morePhotos: "and more" },
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

function buildKnowledgeInner(locale: LingLocale, fullPhotoCaptions: boolean): string {
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
    // TODO(Phase 4): 行程变多后改为 get_trip_detail 工具按需取逐图说明，常驻提示词只保留标题与张数。
    const shown = fullPhotoCaptions ? captions : captions.slice(0, 4);
    shown.forEach((caption, i) => {
      // 带上 travel-data 的短关键词（如「睡魔面部」「生剥鬼下山」），帮模型把照片与祭典/地点对准，避免混淆相近条目。
      const keyword = trip.photos[i]?.desc;
      lines.push(keyword ? `  ${i + 1}. 【${keyword}】${caption}` : `  ${i + 1}. ${caption}`);
    });
    if (!fullPhotoCaptions && captions.length > shown.length) {
      lines.push(`  …${h.morePhotos}（${total} ${h.photosUnit}）`);
    }
  }

  return lines.join("\n");
}

export function buildKnowledge(locale: LingLocale): string {
  const full = buildKnowledgeInner(locale, true);
  if (full.length <= MAX_KNOWLEDGE_CHARS) return full;
  return buildKnowledgeInner(locale, false);
}
