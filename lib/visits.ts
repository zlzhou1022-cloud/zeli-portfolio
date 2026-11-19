import { Redis } from "@upstash/redis";

// 访客 IP 记录与地理标注（2026-11-19 站长要求）：
// - middleware 在页面访问时把不同 IP 按 JST 日期存入 Redis 集合
//   （键 visits:ips:<YYYY-MM-DD>，8 天过期，天然形成近 7 天滚动窗口）；
// - 监控页读取时为每个 IP 补地理位置：国家 · 一级行政区（省/县/州）· 城市，
//   即 IP 定位能达到的「二级行政单位」精度；结果缓存 30 天，一个 IP 只查一次。
// 地理数据源：ipwho.is（免费、无需密钥）。查询失败缓存 1 天，避免反复打外部接口。

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  signal: () => AbortSignal.timeout(5000),
});

export interface IpGeo {
  country: string;
  region?: string;
  city?: string;
}

export interface DayVisits {
  date: string; // YYYY-MM-DD (JST)
  entries: { ip: string; label: string }[];
}

const GEO_TTL_OK = 30 * 24 * 3600;
const GEO_TTL_FAIL = 24 * 3600;

export function jstDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// @upstash/redis 的 GET 会自动反序列化 JSON（见 quota.ts 的教训），两种形态都认。
function parseSnap<T>(raw: unknown): T | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  return raw as T;
}

function isPrivateIp(ip: string): boolean {
  return /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|::1$|fc|fd|fe80)/i.test(ip);
}

export function geoLabel(geo: IpGeo | null): string {
  if (!geo) return "位置未知";
  const parts = [geo.country, geo.region, geo.city].filter(
    (v, i, a) => v && a.indexOf(v) === i,
  );
  return parts.length ? parts.join(" · ") : "位置未知";
}

async function lookupGeo(ip: string): Promise<IpGeo | null> {
  try {
    const res = await fetch("https://ipwho.is/" + encodeURIComponent(ip), {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      success?: boolean;
      country?: string;
      region?: string;
      city?: string;
    };
    if (!data.success || !data.country) return null;
    return { country: data.country, region: data.region, city: data.city };
  } catch {
    return null;
  }
}

async function getGeo(ip: string): Promise<IpGeo | null> {
  if (isPrivateIp(ip)) return { country: "本地 / 内网" };
  const key = "geo:" + ip;
  try {
    const cached = parseSnap<IpGeo>(await redis.get(key));
    if (cached) return cached.country === "未知" ? null : cached;
  } catch {
    // 缓存读失败就直接查
  }
  const geo = await lookupGeo(ip);
  try {
    await redis.set(key, JSON.stringify(geo ?? { country: "未知" }), {
      ex: geo ? GEO_TTL_OK : GEO_TTL_FAIL,
    });
  } catch {
    // 缓存写失败不影响展示
  }
  return geo;
}

// 近 N 天（JST）的访客 IP 列表，新日期在前；含每天的不同 IP 数与跨天去重总数。
export async function getRecentVisits(days: number = 7): Promise<{
  days: DayVisits[];
  todayCount: number;
  uniqueTotal: number;
}> {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    dates.push(jstDateString(new Date(Date.now() - i * 24 * 3600 * 1000)));
  }
  const perDay: string[][] = [];
  const allIps = new Set<string>();
  for (const date of dates) {
    let members: string[] = [];
    try {
      members = (await redis.smembers("visits:ips:" + date)) ?? [];
    } catch (err) {
      console.error("[visits] read day set failed:", date, err);
    }
    perDay.push(members);
    for (const ip of members) allIps.add(ip);
  }
  const geoByIp = new Map<string, IpGeo | null>();
  await Promise.all(
    [...allIps].map(async (ip) => {
      geoByIp.set(ip, await getGeo(ip));
    }),
  );
  const dayVisits: DayVisits[] = dates.map((date, i) => ({
    date,
    entries: perDay[i]
      .slice()
      .sort()
      .map((ip) => ({ ip, label: geoLabel(geoByIp.get(ip) ?? null) })),
  }));
  return {
    days: dayVisits,
    todayCount: perDay[0]?.length ?? 0,
    uniqueTotal: allIps.size,
  };
}
