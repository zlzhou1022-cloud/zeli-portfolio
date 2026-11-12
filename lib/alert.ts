// 基础设施故障告警
// 当 Redis / Supabase 等外部依赖不可用时，通过 LINE Messaging API 给站长发一条告警。
// 设计原则：
//  1. 告警本身绝不能把请求拖下水——内部全捕获，最长等 3 秒，失败静默（仅 console.error）。
//  2. 同一来源 6 小时内只发一次（进程内去重；serverless 冷启动可能偶发重复，可接受）。
//  3. 环境变量未配置时静默降级为只打日志，功能代码可先于告警通道上线。
// 需要的环境变量（Vercel）：
//  LINE_CHANNEL_ACCESS_TOKEN —— LINE Developers 里 Messaging API 频道的长期令牌
//  LINE_ALERT_USER_ID        —— 站长本人对该频道的 userId

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";
const COOLDOWN_MS = 6 * 60 * 60 * 1000;

const lastSentAt = new Map<string, number>();

export async function reportInfraFailure(
  source: string,
  error: unknown,
  opts?: { test?: boolean },
): Promise<void> {
  try {
    console.error(`[infra-alert] ${source}:`, error);

    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const userId = process.env.LINE_ALERT_USER_ID;
    if (!token || !userId) return;

    const isTest = opts?.test === true;
    if (!isTest) {
      const now = Date.now();
      const last = lastSentAt.get(source) ?? 0;
      if (now - last < COOLDOWN_MS) return;
      lastSentAt.set(source, now); // 先占位，防止并发请求重复发送
    }

    const time = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
    const detail = error instanceof Error ? error.message : String(error);
    const text = isTest
      ? [
          "🧪 zeli-portfolio 告警通道测试",
          "这是一条手动触发的测试消息，站点没有故障。",
          `时间: ${time} (JST)`,
        ].join("\n")
      : [
          "⚠️ zeli-portfolio 基础设施告警",
          `来源: ${source}`,
          `时间: ${time} (JST)`,
          `异常: ${detail.slice(0, 200)}`,
          "站点已自动降级运行（相关功能受限，但页面可访问）。请尽快检查 Upstash / Supabase 状态。",
        ].join("\n");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      await fetch(LINE_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: userId,
          messages: [{ type: "text", text }],
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // 告警通道自身失败时静默
  }
}
