import { tool} from "ai";
import { z} from "zod";
import { getAllProjects} from "@/lib/lab-data";
import { getAllTrips, getTripById} from "@/lib/travel-data";
import cnMessages from "@/messages/cn.json";
import jpMessages from "@/messages/jp.json";
import enMessages from "@/messages/en.json";
import type { LingLocale} from "./knowledge";

// 工具总开关（配置级止血）：改 false 后 route 不传 tools，小灵退回 PR-C 的纯文本行为，
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
const STATIC_PATHS = ["", "/profile", "/lab", "/travels", "/guestbook"];

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
"List all travel stories on this site. Returns each trip's id, localized title, date, photo count and internal path. Use this when the visitor asks what travel stories exist.",
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
"Get the full detail of one travel story, including the caption of every photo (where each photo was taken). Use this when the visitor asks about a specific trip or a specific photo. If the trip id does not exist, the result says so — never invent a trip.",
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
"List the lab projects on this site with localized title, description, tags and external URL. Use this when the visitor asks what projects Zeli has built.",
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
"Recommend a travel story by season and/or theme. The server scores trips by their date (season) and photo captions (theme keywords) and returns ranked candidates; you pick one and explain why. Use this when the visitor asks where to go or what to see in a season, or asks for snow/festival/scenery recommendations.",
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
return {
candidates: matched.length > 0? matched: scored,
exactMatch: matched.length > 0,
note:
matched.length > 0
? "Candidates ranked by the server; pick the best one and explain why."
: "No trip matches exactly; these are all the trips on the site — recommend the closest one honestly, or say there is no exact match.",
};
},
}),

navigate_to: tool({
description:
"Offer the visitor a navigation card to an internal page. Call this when you recommend a specific page: the visitor sees an 'open page' card and clicks it themselves (no automatic redirect). Valid targets: home, /profile, /lab, /travels, /travels/<tripId>, /guestbook (with or without locale prefix). After calling it, still write a normal sentence telling the visitor what the page is.",
inputSchema: z.object({
path: z.string().describe("Internal path such as /travels/tohoku-feb-2026 or /profile"),
}),
execute: async ({ path}) => {
const normalized = normalizeNavPath(locale, path);
if (!normalized) {
return {
ok: false,
note: "That path is not an allowed internal page. Use a plain Markdown link instead.",
allowed: ["/", "/profile", "/lab", "/travels", "/travels/<tripId>", "/guestbook"],
};
}
return { ok: true, path: normalized};
},
}),
};
}
