import { Redis } from "@upstash/redis";

// 聊天额度快照（2026-11-19 站长要求：管理员监控页显示实时剩余额度）。
// Groq 在每次 API 响应的 x-ratelimit-* 头里带真实剩余量：聊天路由每次调用后
// 把响应头抄进 Redis，监控页读快照渲染；另有手动探测（probeQuota）各发一次
// 极小请求刷新。Gemini 免费档没有额度查询接口/响应头，只能记最近可用状态。
// 本模块所有写操作内部吞错——记账失败绝不能影响聊天本身。

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  signal: () => AbortSignal.timeout(2500),
});

const GROQ_KEY = "ling:quota:groq";
const GEMINI_KEY = "ling:quota:gemini";

export interface GroqQuota {
  limitTokens: number | null;
  remainingTokens: number | null;
  limitRequests: number | null;
  remainingRequests: number | null;
  resetTokens: string | null;
  resetRequests: string | null;
  capturedAt: string;
  source: "chat" | "probe";
}

export interface GeminiStatus {
  lastOkAt: string | null;
  lastErrorAt: string | null;
  lastErrorKind: string | null;
  capturedAt: string;
  source: "chat" | "probe";
}

function num(v: string | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function recordGroqHeaders(
  headers: Record<string, string>,
  source: "chat" | "probe",
): Promise<void> {
  try {
    const h: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) h[k.toLowerCase()] = v;
    if (h["x-ratelimit-remaining-tokens"] == null && h["x-ratelimit-limit-tokens"] == null) {
      // 没抄到限流头也要留痕，否则下次又是「没数据」无从查起。
      console.error(
        "[quota] groq response without ratelimit headers; x- headers present:",
        Object.keys(h).filter((k) => k.startsWith("x-")).join(", ") || "(none)",
      );
      return;
    }
    const snap: GroqQuota = {
      limitTokens: num(h["x-ratelimit-limit-tokens"]),
      remainingTokens: num(h["x-ratelimit-remaining-tokens"]),
      limitRequests: num(h["x-ratelimit-limit-requests"]),
      remainingRequests: num(h["x-ratelimit-remaining-requests"]),
      resetTokens: h["x-ratelimit-reset-tokens"] ?? null,
      resetRequests: h["x-ratelimit-reset-requests"] ?? null,
      capturedAt: new Date().toISOString(),
      source,
    };
    await redis.set(GROQ_KEY, JSON.stringify(snap));
  } catch (err) {
    // 快照失败不影响聊天，但要在服务端日志留痕
    console.error("[quota] write groq snapshot failed:", err);
  }
}

export async function recordGeminiStatus(
  ok: boolean,
  kind: string | null,
  source: "chat" | "probe",
): Promise<void> {
  try {
    const prev = await getGeminiStatus();
    const now = new Date().toISOString();
    const snap: GeminiStatus = {
      lastOkAt: ok ? now : (prev?.lastOkAt ?? null),
      lastErrorAt: ok ? (prev?.lastErrorAt ?? null) : now,
      lastErrorKind: ok ? (prev?.lastErrorKind ?? null) : (kind ?? "stream_error"),
      capturedAt: now,
      source,
    };
    await redis.set(GEMINI_KEY, JSON.stringify(snap));
  } catch (err) {
    // 同上（不影响聊天，只留痕）
    console.error("[quota] write gemini snapshot failed:", err);
  }
}

// @upstash/redis 默认自动反序列化：存进去的 JSON 字符串读出来已经是对象，
// 再 JSON.parse(对象) 会抛错被吞成 null——2026-11-19「探测通了但没数据」的
// 根因就是这里。读取必须字符串/对象两种形态都认。
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

export async function getGroqQuota(): Promise<GroqQuota | null> {
  try {
    return parseSnap<GroqQuota>(await redis.get(GROQ_KEY));
  } catch (err) {
    console.error("[quota] read groq snapshot failed:", err);
    return null;
  }
}

export async function getGeminiStatus(): Promise<GeminiStatus | null> {
  try {
    return parseSnap<GeminiStatus>(await redis.get(GEMINI_KEY));
  } catch (err) {
    console.error("[quota] read gemini snapshot failed:", err);
    return null;
  }
}

const PROBE_KEY = "ling:quota:probe";

// 最近一次手动探测的完成时间。无论探测成败都写——监控页显示它，站长点完
// 按钮至少能看到时间变化，确认点击生效（2026-11-19 站长反馈按钮没反馈后加）。
export async function getLastProbeAt(): Promise<string | null> {
  try {
    return (await redis.get<string>(PROBE_KEY)) ?? null;
  } catch {
    return null;
  }
}

async function recordProbeMark(): Promise<void> {
  try {
    await redis.set(PROBE_KEY, new Date().toISOString());
  } catch {
    // 同上
  }
}

// 手动探测：给两家各发一次极小请求（输入几个词元、输出上限 1），刷新快照。
// Groq 即使返回 429，响应头也带剩余量，照样能抄；Gemini 只记成功/失败类别。
// 两家并行探测（原来串行最长约 16 秒，改并行后约 8 秒封顶）。
export async function probeQuota(): Promise<void> {
  await Promise.allSettled([probeGroq(), probeGemini()]);
  await recordProbeMark();
}

async function probeGroq(): Promise<void> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + String(process.env.GROQ_API_KEY),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(8000),
    });
    await recordGroqHeaders(Object.fromEntries(res.headers.entries()), "probe");
  } catch {
    // 探测失败保持旧快照
  }
}

async function probeGemini(): Promise<void> {
  try {
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "hi" }] }],
          generationConfig: { maxOutputTokens: 1 },
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (res.ok) {
      await recordGeminiStatus(true, null, "probe");
    } else {
      const kind =
        res.status === 503 ? "rate_limited" : res.status === 429 ? "quota_exceeded" : `http_${res.status}`;
      await recordGeminiStatus(false, kind, "probe");
    }
  } catch {
    await recordGeminiStatus(false, "network", "probe");
  }
}
