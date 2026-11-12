import { getAllProjects } from "@/lib/lab-data";
import { getAllTrips } from "@/lib/travel-data";
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
      lines.push(`  ${i + 1}. ${caption}`);
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
