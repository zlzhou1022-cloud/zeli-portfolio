import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { reportInfraFailure } from "@/lib/alert";
import { buildSystemPrompt, LING_PROMPT_VERSION } from "@/lib/ling/prompt";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  signal: () => AbortSignal.timeout(2500), // 硬超时，理由同 middleware
});

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "127.0.0.1";
    
    // 接收前端传来的完整聊天记录、唯一会话 ID 和当前语言（locale 可缺省）
    const { messages, chatId, locale } = await req.json();

    // 1. 检查配额（两层）
    const today = new Date().toISOString().split('T')[0];

    // 层1：全局配额 —— 当天 chat_logs 新建行数超过 50 时关闭所有人的入口
    const globalQuotaKey = `chat_new_sessions:${today}`;
    // 层2：session 配额 —— 单个 session 累计消息超过 5000 条时关闭该用户入口
    const sessionQuotaKey = `chat_session_msgs:${chatId}`;
    // 容错：Redis 不可用时按「配额未用」降级放行并告警，不让缓存故障关掉聊天入口。
    let globalQuota = 0;
    let sessionMsgCount = 0;
    try {
      globalQuota = await redis.get<number>(globalQuotaKey) ?? 0;
      sessionMsgCount = await redis.get<number>(sessionQuotaKey) ?? 0;
    } catch (err) {
      await reportInfraFailure('chat/redis-quota', err);
    }
    if (globalQuota >= 50) {
      return new NextResponse("daily_quota_full", { status: 403 });
    }
    if (sessionMsgCount >= 5000) {
      return new NextResponse("session_quota_full", { status: 403 });
    }

    // 2. 组装系统提示词：人设/风格/导航/边界在 lib/ling/prompt.ts，
    // 事实由 lib/ling/knowledge.ts 在请求时从 messages/lab-data/travel-data 拼装（单一真相）。
    const lastUserContent = [...messages].reverse().find((m: { role: string }) => m.role === "user")?.content ?? "";
    const { locale: resolvedLocale, prompt: systemContent } = buildSystemPrompt(locale, lastUserContent);
    console.log(`[ling] version=${LING_PROMPT_VERSION} locale=${resolvedLocale} chat=${String(chatId).slice(0, 8)}`);
    const systemPrompt = { role: "system", content: systemContent };

    // 3. 呼叫大模型 (Groq API)：只发最近 20 条历史；发送前剥离 timestamp 等非标准字段
    const messagesForLLM = messages
      .slice(-20)
      .map(({ role, content }: { role: string; content: string; timestamp?: string }) => ({ role, content }));
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b", // llama-3.3-70b-versatile 已于 2026-08-16 被 Groq 退役，官方替代为 gpt-oss-120b
        messages: [systemPrompt, ...messagesForLLM],
        temperature: 0.5,
        max_tokens: 800,
        reasoning_effort: "low",
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ LLM API 报错详情:", errorData);
      return new NextResponse("AI 接口调用失败", { status: 500 });
    }

    const data = await response.json();
    // 只取 content，剥离 gpt-oss 的 reasoning 等字段（存库与返回都只用 {role, content}）
    const aiMessage = {
      role: "assistant",
      content: (data.choices?.[0]?.message?.content ?? "") as string,
    };

    // 给本轮新增的两条消息打上时间戳（历史消息已有时间戳，不重复打）
    const now = new Date().toISOString();
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg && !lastUserMsg.timestamp) {
      lastUserMsg.timestamp = now;
    }
    const aiMessageWithTs = { ...aiMessage, timestamp: now };
    const fullHistory = [...messages, aiMessageWithTs];

    // 4. Upsert 逻辑：有则更新（覆盖），无则插入
    const { error: dbError } = await supabaseAdmin
      .from('chat_logs')
      .upsert({
        id: chatId,
        ip: ip,
        messages: fullHistory,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });
      
    if (dbError) {
      console.error("❌ 更新聊天快照失败:", dbError);
    } else {
      console.log(`✅ 会话 ${chatId?.slice(0,8)}... 已成功更新数据库快照!`);
    }
      
    // 5. 更新配额计数（容错：计数失败只告警，不能把已经成功的回复变成 500）
    try {
      // session 消息数：每次对话 +1，永不过期（session 本身就是持久的）
      await redis.incr(sessionQuotaKey);
      // 全局新建行数：仅在新 session 首次创建时 +1（通过判断 session 消息数是否为 0）
      if (sessionMsgCount === 0) {
        await redis.incr(globalQuotaKey);
        await redis.expire(globalQuotaKey, 60 * 60 * 24);
      }
    } catch (err) {
      await reportInfraFailure('chat/redis-counter', err);
    }

    return NextResponse.json(aiMessageWithTs);

  } catch (error) {
    console.error("❌ 聊天后端发生未知错误:", error);
    return new NextResponse("服务器内部错误", { status: 500 });
  }
}
