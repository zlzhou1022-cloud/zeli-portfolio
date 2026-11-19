import { tool} from "ai";
import { z} from "zod";
import { getAllProjects} from "@/lib/lab-data";
import { getAllTrips, getTripById} from "@/lib/travel-data";
import { getPrefecture} from "@/lib/prefectures";
import cnMessages from "@/messages/cn.json";
import jpMessages from "@/messages/jp.json";
import enMessages from "@/messages/en.json";
import type { LingLocale} from "./knowledge";

// 工具总开关（配置级止血）：改 false 后 route 不传 tools，慕斯退回 PR-C 的纯文本行为，
// 无需 revert 即可下线工具调用（规格 §6 Phase 4）。
export const LING_TOOLS_ENABLED = true;

// 披露白名单与 knowledge.ts 相同：只读 messages 的 Projects / Trips、
// lib/lab-data.ts、lib/travel-data.ts，不引入任何其他数据源。
type MessagesShape = typeof cnMessages;

const MESSAGES: Record<LingLocale, MessagesShape> = {
cn: cnMessages as MessagesShape,
jp: jpMessages as unknown as MessagesShape,
en: enMessages as unknown as MessagesShape,
};

function tripTitle(locale: LingLocale, tripId: string): string {
const m = MESSAGES[locale];
const t = m.Trips[tripId as keyof typeof m.Trips] as { title: string} | undefined;
return t?.title?? tripId;
}

function tripCaptions(locale: LingLocale, tripId: string): string[] {
const m = MESSAGES[locale];
const t = m.Trips[tripId as keyof typeof m.Trips] as
| { title: string; photos: Record<string, string>}
| undefined;
if (!t) return [];
const trip = getTripById(tripId);
if (!trip) return [];
return trip.photos
.map((photo, i) => {
const caption = t.photos[String(i + 1)];
if (!caption) return null;
return photo.desc? `${caption}`: caption;
})
.filter((c): c is string => Boolean(c));
}

const SEASON_MONTHS: Record<string, number[]> = {
spring: [3, 4, 5],
summer: [6, 7, 8],
autumn: [9, 10, 11],
winter: [12, 1, 2],
};

// navigate_to 白名单：只允许这些站内页面（单篇游记单独校验 id 存在）。
const STATIC_PATHS = ["", "/profile", "/lab", "/games", "/games/prefecture-game", "/games/room", "/games/garden", "/travels", "/guestbook"];

function normalizeNavPath(locale: LingLocale, raw: string): string | null {
let p = raw.trim();
if (!p.startsWith("/")) p = `/${p}`;
// 去掉可能自带的 locale 前缀，统一用当前 locale 重拼。
const seg = p.split("/").filter(Boolean);
if (seg.length > 0 && (seg[0] === "cn" || seg[0] === "jp" || seg[0] === "en")) {
seg.shift();
}
const rest = seg.length? `/${seg.join("/")}`: "";
if (STATIC_PATHS.includes(rest)) {
return `/${locale}${rest}`;
}
if (rest.startsWith("/travels/")) {
const tripId = rest.slice("/travels/".length);
if (tripId && getTripById(tripId)) return `/${locale}${rest}`;
return null;
}
return null;
}

export function createLingTools(locale: LingLocale) {
return {
list_trips: tool({
description:
"List all travel stories (id, title, date, photo count, path). Use when asked what travel stories exist.",
inputSchema: z.object({}),
execute: async () => {
const trips = getAllTrips().map((trip) => ({
id: trip.id,
title: tripTitle(locale, trip.id),
date: trip.date,
photoCount: trip.photos.length,
path: `/${locale}/travels/${trip.id}`,
}));
return { trips};
},
}),

get_trip_detail: tool({
description:
"Full detail of one trip, incl. every photo's caption. Use for questions about a specific trip or photo. Unknown id returns not-found — never invent.",
inputSchema: z.object({
tripId: z.string().describe("The trip id, e.g. tohoku-feb-2026 (get ids from list_trips)"),
}),
execute: async ({ tripId}) => {
const trip = getTripById(tripId);
if (!trip) {
return { found: false, tripId, note: "No travel story with this id exists on the site."};
}
return {
found: true,
id: trip.id,
title: tripTitle(locale, trip.id),
date: trip.date,
photoCount: trip.photos.length,
path: `/${locale}/travels/${trip.id}`,
photos: tripCaptions(locale, trip.id),
};
},
}),

list_projects: tool({
description:
"List lab projects (title, description, tags, URL). Use when asked what projects Zeli has built.",
inputSchema: z.object({}),
execute: async () => {
const m = MESSAGES[locale];
const projects = getAllProjects().map((project) => {
const t = m.Projects[project.id as keyof typeof m.Projects] as
| { title: string; description: string}
| undefined;
return {
id: project.id,
title: t?.title?? project.title,
description: t?.description?? project.description,
tags: project.tags,
url: project.url,
path: `/${locale}/lab`,
};
});
return { projects};
},
}),

recommend_trip: tool({
description:
"Recommend a trip by season/theme; server returns ranked candidates, you pick one and explain why. Use for where-to-go or seasonal recommendation asks.",
inputSchema: z.object({
season: z
.enum(["spring", "summer", "autumn", "winter"])
.optional()
.describe("Season the visitor cares about, if any"),
theme: z
.string()
.optional()
.describe("Theme keyword such as snow, festival, food, shrine — in any language"),
}),
execute: async ({ season, theme}) => {
const scored = getAllTrips().map((trip) => {
let score = 0;
const reasons: string[] = [];
if (season) {
const month = new Date(trip.date).getMonth() + 1;
if (SEASON_MONTHS[season]?.includes(month)) {
score += 2;
reasons.push(`season:${season}`);
}
}
if (theme) {
// 地点优先（2026-11-19）：主题词命中县名/地点名时权重高于季节与一般主题词。
const placeHaystack = trip.photos
.map((p) => [p.place.cn, p.place.jp, p.place.en, getPrefecture(p.prefecture)?.cn ?? "", getPrefecture(p.prefecture)?.jp ?? "", getPrefecture(p.prefecture)?.en ?? ""].join(" "))
.join(" ");
if (placeHaystack.includes(theme)) {
score += 3;
reasons.push(`place:${theme}`);
}
const haystack = [
tripTitle(locale, trip.id),
...trip.photos.map((p) => p.desc),
...tripCaptions(locale, trip.id),
].join(" ");
if (haystack.includes(theme)) {
score += 2;
reasons.push(`theme:${theme}`);
}
}
return {
id: trip.id,
title: tripTitle(locale, trip.id),
date: trip.date,
photoCount: trip.photos.length,
path: `/${locale}/travels/${trip.id}`,
score,
reasons,
};
});
scored.sort((a, b) => b.score - a.score);
const matched = scored.filter((s) => s.score > 0);
if (matched.length === 0) {
// 空结果纪律：不许把不相关的游记当匹配递出去；只给全量简表供她如实说明。
return {
candidates: [],
exactMatch: false,
allTrips: scored.map((s) => ({ title: s.title, date: s.date })),
note: "No trip matches the requested season/theme at all. Tell the visitor honestly that there is no matching trip; you may name what does exist (allTrips) but never present an unrelated trip as a match.",
};
}
return {
candidates: matched,
exactMatch: true,
note: "Candidates ranked by the server; pick the best one and explain why.",
};
},
}),

search_photos: tool({
description:
"Search ALL photos across every trip by keyword (captions, place/prefecture names, keywords, semantic tags). Use for photos of a specific subject/place/scene. Returns matches with direct links; empty means none — never invent a photo.",
inputSchema: z.object({
query: z.string().describe("Keyword to search for, in any language, e.g. 海, 神社, sea, shrine, 桜島"),
limit: z.number().optional().describe("Max results to return (default 5, max 10)"),
}),
execute: async ({ query, limit}) => {
// 规范化（NFKC+小写+去空格）抹平全半角/大小写差异；同义词组做跨语言扩展
// （2026-11-19 与 ChatGPT 讨论定的低成本方案，词条按本站照片实际主题选）。
const norm = (s: string) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const SYNONYM_GROUPS: string[][] = [
["雪", "雪景", "雪景色", "snow", "snowy"],
["海", "海岸", "海边", "sea", "ocean", "coast", "beach"],
["祭", "祭典", "まつり", "festival"],
["神社", "shrine"],
["寺", "寺院", "寺庙", "temple"],
["美食", "料理", "グルメ", "food", "cuisine"],
["夜景", "夜", "night", "nightscape"],
["樱花", "桜", "さくら", "sakura", "cherryblossom"],
["红叶", "紅葉", "枫叶", "もみじ", "autumnleaves", "foliage"],
["桥", "橋", "bridge"],
["电车", "電車", "火车", "列车", "train", "tram"],
["鸟居", "鳥居", "torii"],
["温泉", "溫泉", "onsen", "hotspring", "地狱", "地獄", "足汤", "足湯", "露天风吕", "露天風呂", "源泉"],
];
const q = norm(query.trim());
const max = Math.min(Math.max(limit ?? 5, 1), 10);
if (!q) return { found: false, results: [], note: "Empty query."};
const tokens = query.toLowerCase().split(/[\s,、，]+/).map((t) => norm(t)).filter((t) => t.length >= 1);
// 查询命中的同义词组：组内其他词也算命中（权重低一档）。
const expanded = new Set<string>();
let onsenTriggered = false;
for (const group of SYNONYM_GROUPS) {
const g = group.map(norm);
if (g.some((term) => q.includes(term) || tokens.some((tok) => tok === term))) {
g.forEach((term) => expanded.add(term));
if (group.includes("温泉")) onsenTriggered = true;
}
}
type Hit = { tripId: string; title: string; photo: number; caption: string; place: string; prefecture: string; matchedTerms: string[]; path: string; score: number; primary: boolean };
const hits: Hit[] = [];
for (const trip of getAllTrips()) {
const m = MESSAGES[locale];
const t = m.Trips[trip.id as keyof typeof m.Trips] as | { title: string; photos: Record<string, string>} | undefined;
trip.photos.forEach((photo, i) => {
const caption = t?.photos[String(i + 1)] ?? "";
const pref = getPrefecture(photo.prefecture);
const fields: { text: string; weight: number}[] = [
{ text: caption, weight: 3 },
{ text: [photo.place.cn, photo.place.jp, photo.place.en].join(" "), weight: 3 },
{ text: photo.desc, weight: 2 },
{ text: pref ? [pref.cn, pref.jp, pref.en].join(" ") : "", weight: 2 },
{ text: tripTitle(locale, trip.id), weight: 1 },
];
let score = 0;
const matched = new Set<string>();
for (const f of fields) {
const hay = norm(f.text);
if (hay.includes(q)) { score += f.weight; matched.add(query.trim()); }
else if (tokens.length > 1 && tokens.some((tok) => tok.length >= 2 && hay.includes(tok))) { score += f.weight - 1; matched.add(query.trim()); }
for (const term of expanded) {
if (term !== q && hay.includes(term)) { score += Math.max(f.weight - 1, 1); matched.add(term); break; }
}
}
// 语义标签命中 = 照片本体就是所找的东西（如别府双地狱之于温泉），
// 权重最高并标 primary，与「说明里顺带出现该词」（温泉蛋、地狱蒸）区分开。
let primary = false;
if (onsenTriggered && photo.tags?.includes("onsen")) {
score += 6;
primary = true;
matched.add("onsen");
}
if (score > 0) {
hits.push({
tripId: trip.id,
title: tripTitle(locale, trip.id),
photo: i + 1,
caption,
place: photo.place[locale] ?? photo.place.cn,
prefecture: pref ? pref[locale] : photo.prefecture,
matchedTerms: [...matched],
path: `/${locale}/travels/${trip.id}?p=${i + 1}`,
score,
primary,
});
}
});
}
hits.sort((a, b) => Number(b.primary) - Number(a.primary) || b.score - a.score);
const results = hits.slice(0, max).map(({ score, ...rest }) => rest);
return {
found: results.length > 0,
results,
note:
results.length > 0
? "These photos really exist on the site. Link the visitor to the exact photo with its path. Results with primary=true ARE the subject itself — present those first as the answer. Results without it only matched a word in a caption (e.g. an onsen egg in a dish, food steamed with onsen steam): present them afterwards, clearly framed as related extras, never as the subject itself."
: "No photo matches. Tell the visitor honestly that there is no such photo in the albums; do not invent one.",
};
},
}),

navigate_to: tool({
description:
"Show a navigation card to an internal page (visitor clicks it; no auto-redirect). Valid: home, /profile, /lab, /games, /games/prefecture-game, /games/room, /games/garden, /travels, /travels/<tripId>, /guestbook. Still write a normal sentence about the page.",
inputSchema: z.object({
path: z.string().describe("Internal path such as /travels/tohoku-feb-2026 or /profile"),
}),
execute: async ({ path}) => {
const normalized = normalizeNavPath(locale, path);
if (!normalized) {
return {
ok: false,
note: "That path is not an allowed internal page. Use a plain Markdown link instead.",
allowed: ["/", "/profile", "/lab", "/games", "/games/prefecture-game", "/games/room", "/games/garden", "/travels", "/travels/<tripId>", "/guestbook"],
};
}
return { ok: true, path: normalized};
},
}),

get_current_time: tool({
description:
"Current date/time in Tokyo (JST) with weekday. Always use for time/date/weekday questions — never guess the time.",
inputSchema: z.object({}),
execute: async () => {
const parts = new Intl.DateTimeFormat("en-US", {
timeZone: "Asia/Tokyo",
year: "numeric",
month: "2-digit",
day: "2-digit",
hour: "2-digit",
minute: "2-digit",
hourCycle: "h23",
weekday: "long",
}).formatToParts(new Date());
const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
const hour = Number(get("hour"));
const dayPeriod =
hour < 5 ? "late night" : hour < 11 ? "morning" : hour < 14 ? "midday" : hour < 18 ? "afternoon" : hour < 23 ? "evening" : "late night";
return {
timezone: "Asia/Tokyo (JST, UTC+9)",
date: `${get("year")}-${get("month")}-${get("day")}`,
time: `${get("hour")}:${get("minute")}`,
weekday: get("weekday"),
dayPeriod,
};
},
}),
};
}
