import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { reportInfraFailure } from "@/lib/alert";
import { buildSystemPrompt, LING_PROMPT_VERSION } from "@/lib/ling/prompt";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import { streamText, stepCountIs } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createLingTools, LING_TOOLS_ENABLED } from "@/lib/ling/tools";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  signal: () => AbortSignal.timeout(2500), // 硬超时，理由同 middleware
});

// Groq 是 OpenAI 兼容端点；用 AI SDK 的 openai-compatible provider 接入流式与（Phase 4 的）工具调用。
const groq = createOpenAICompatible({
  name: "groq",
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
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

    // 3. 流式呼叫大模型：只发最近 20 条历史；剥离 timestamp 等非标准字段。
    // text 只含正文（reasoning 是独立 part，不会进入 text），存库与计数在 onFinish 里做。
    const messagesForLLM = messages
      .slice(-20)
      .map(({ role, content }: { role: string; content: string; timestamp?: string }) => ({
        role: role as "user" | "assistant" | "system",
        content,
      }));

    // 访客点停止/断开连接时 req.signal 会 abort：标记后 onFinish 不落库半条回复。
    let clientAborted = false;
    req.signal?.addEventListener("abort", () => {
      clientAborted = true;
    });

    const result = streamText({
      model: groq("openai/gpt-oss-120b"), // llama-3.3-70b-versatile 已于 2026-08-16 被 Groq 退役，官方替代为 gpt-oss-120b
      system: systemContent,
      messages: messagesForLLM,
      // Phase 4 工具调用：步数上限 3 步防死循环；工具失败降级为纯文本回答。
      // LING_TOOLS_ENABLED=false 时不传 tools，即退回 Phase 3 行为（配置级止血）。
      ...(LING_TOOLS_ENABLED
        ? { tools: createLingTools(resolvedLocale), stopWhen: stepCountIs(3) }
        : {}),
      temperature: 0.5,
      maxOutputTokens: 800,
      abortSignal: req.signal,
      providerOptions: {
        groq: { reasoningEffort: "low" },
      },
      onFinish: async ({ text, finishReason }) => {
        // 被前端中断（abort）时不落库、不计数：半条回复只留在访客本地。
        if (!text || clientAborted || finishReason === "error") return;
        try {
          const now = new Date().toISOString();
          const lastUserMsg = messages[messages.length - 1];
          if (lastUserMsg && !lastUserMsg.timestamp) {
            lastUserMsg.timestamp = now;
          }
          const aiMessageWithTs = { role: "assistant", content: text, timestamp: now };
          const fullHistory = [...messages, aiMessageWithTs];

          // 4. Upsert 逻辑：有则更新（覆盖），无则插入（形状与旧版一致，Lambda 按此读）
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
            console.log(`✅ 会话 ${chatId?.slice(0, 8)}... 已成功更新数据库快照!`);
          }

          // 5. 更新配额计数（容错：计数失败只告警，不能影响已完成的回复）
          try {
            await redis.incr(sessionQuotaKey);
            if (sessionMsgCount === 0) {
              await redis.incr(globalQuotaKey);
              await redis.expire(globalQuotaKey, 60 * 60 * 24);
            }
          } catch (err) {
            await reportInfraFailure('chat/redis-counter', err);
          }
        } catch (err) {
          console.error("❌ onFinish 落库失败:", err);
        }
      },
      onError: ({ error }) => {
        console.error("❌ LLM 流式调用报错:", error);
      },
    });

    return result.toUIMessageStreamResponse();

  } catch (error) {
    console.error("❌ 聊天后端发生未知错误:", error);
    return new NextResponse("服务器内部错误", { status: 500 });
  }
}
