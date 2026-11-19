import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { reportInfraFailure } from './lib/alert';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  // 单次请求硬超时 2.5 秒：端点被黑洞（连得上但不回应）时也能及时触发下面的降级，
  // 而不是让访客的请求一直挂着（客户端默认重试 5 次、无超时）。
  signal: () => AbortSignal.timeout(2500),
});

// 全站普通页面防刷限制 (每分钟 600 次)
const generalLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(600, "1 m"),
});

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";

  // 💡 修复：如果是前端向后端的 API 请求，直接放行，绝对不要走多语言解析！
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 1. 放行逻辑不变
  if (pathname.startsWith('/_next') || pathname.startsWith('/admin') || pathname.includes('.')) {
    return intlMiddleware(request);
  }

  // 💡 2+3. 两道防线都依赖 Redis：黑名单检查 + 全站限流。
  // 容错原则（fail-open）：Redis 不可用时降级放行并告警，绝不让缓存层故障拖垮全站。
  // （2026-11 事故教训：Upstash 免费库被回收，middleware 无 try/catch 直接全站 500。）
  try {
    // 第一道防线：检查手动黑名单（极快）
    const isBlocked = await redis.get(`blocked_ip:${ip}`);
    if (isBlocked) {
      return new NextResponse(`您的 IP 已被管理员封禁。原因: ${isBlocked}`, { status: 403 });
    }

    // 第二道防线：全站页面级基础防御（限流）
    const { success } = await generalLimit.limit(`ratelimit_gen_${ip}`);
    if (!success) {
      return new NextResponse('请求过于频繁，请稍后再试', { status: 429 });
    }

    // 访客记录（2026-11-19 站长要求）：按 JST 日期把不同 IP 存进集合，
    // 监控页据此显示近 7 天访客；集合 8 天过期，天然滚动、不用清理。
    const clientIp = ip.split(",")[0].trim();
    const todayJst = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
    const visitKey = `visits:ips:${todayJst}`;
    await redis.sadd(visitKey, clientIp);
    await redis.expire(visitKey, 8 * 24 * 3600);
  } catch (err) {
    event.waitUntil(reportInfraFailure('middleware/redis', err));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/',
    '/(cn|jp|en)/:path*',
    '/((?!_next|_vercel|admin|.*\\..*).*)'
  ]
};