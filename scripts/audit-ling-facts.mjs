#!/usr/bin/env node
// 慕斯事实区覆盖审计（2026-11-19 与 ChatGPT 讨论后定的轻量机制）。
// 目的：新增游记/页面后，先跑这支脚本再上线——它拦的是今晚三类事故的病根：
// 事实缺失（页面/游记没进事实区）、索引对不上（说明条数≠照片数）、导航缺路径。
// 用法：node scripts/audit-ling-facts.mjs ；有 FAIL 时退出码 1。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf-8");

let failures = 0;
const ok = (name, cond, detail = "") => {
  console.log(`[FACT AUDIT] ${name}: ${cond ? "OK" : "FAIL"}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
};

// 1) 游记数据 ↔ 三语说明 对齐
const travelSrc = read("lib/travel-data.ts");
const tripBlocks = travelSrc.split(/\n  \{\n    id: "/).slice(1);
const trips = tripBlocks.map((b) => {
  const id = b.split('"')[0];
  const end = b.indexOf("\n  },");
  const body = end >= 0 ? b.slice(0, end) : b;
  return { id, photoCount: (body.match(/src: getImageUrl\(/g) || []).length };
});
const msgs = {};
for (const lang of ["cn", "jp", "en"]) msgs[lang] = JSON.parse(read(`messages/${lang}.json`));
for (const trip of trips) {
  for (const lang of ["cn", "jp", "en"]) {
    const t = msgs[lang].Trips?.[trip.id];
    ok(`trip ${trip.id} in ${lang}`, Boolean(t?.title), t ? "" : "Trips 缺条目");
    if (t) {
      const n = Object.keys(t.photos || {}).length;
      ok(`trip ${trip.id} captions ${lang}`, n === trip.photoCount, `${n} 条说明 vs ${trip.photoCount} 张照片`);
    }
  }
}
for (const lang of ["cn", "jp", "en"]) {
  for (const key of Object.keys(msgs[lang].Trips || {})) {
    ok(`no orphan Trips.${key} (${lang})`, trips.some((t) => t.id === key));
  }
}

// 2) 事实区关键部件齐全
const knowledge = read("lib/ling/knowledge.ts");
ok("knowledge has TRAVEL_COVERAGE (47县事实)", knowledge.includes("TRAVEL_COVERAGE"));
ok("knowledge has PAGE_CONTENTS (页面事实)", knowledge.includes("PAGE_CONTENTS"));
for (const kw of ["小屋", "花园", "看图猜县", "向上冲", "留言板", "实验室", "个人主页"]) {
  ok(`page fact mentions ${kw}`, knowledge.includes(kw));
}

// 3) 导航覆盖全部可跳转路径
const tools = read("lib/ling/tools.ts");
const prompt = read("lib/ling/prompt.ts");
const staticPaths = tools.match(/const STATIC_PATHS = \[([^\]]+)\]/)?.[1] || "";
for (const p of staticPaths.match(/"([^"]*)"/g)?.map((s) => s.slice(1, -1)) || []) {
  if (p === "") continue;
  ok(`navigation lists ${p}`, prompt.includes(p));
}
ok("prompt has CLARIFY section", prompt.includes("CLARIFY"));
ok("tools guide mentions search_photos", prompt.includes("search_photos"));
ok("tools.ts has search_photos tool", tools.includes("search_photos: tool"));

// 4) 事实体积预警（粗估：三语逐图说明总字数，越接近上限越要留意分区预算）
let captionChars = 0;
for (const lang of ["cn", "jp", "en"]) {
  for (const t of Object.values(msgs[lang].Trips || {})) {
    captionChars += Object.values(t.photos || {}).join("").length;
  }
}
console.log(`[FACT AUDIT] caption chars (3 locales, all trips): ${captionChars}`);

console.log(failures === 0 ? "[FACT AUDIT] ALL OK" : `[FACT AUDIT] ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
