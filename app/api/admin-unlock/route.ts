import { NextResponse } from "next/server";
import { consumeAdminUnlockToken } from "@/lib/admin-guard";

// 后台登录锁定的一次性解除端点（2026-11-18）：链接只通过站长的 LINE 告警发出，
// 令牌 64 位随机串、1 小时过期、用一次即焚；无效令牌一律 401，不透露任何信息。
export const dynamic = "force-dynamic";

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const ip = token ? await consumeAdminUnlockToken(token) : null;
  if (!ip) {
    return new NextResponse("链接无效或已过期", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const html = `<!doctype html>
<html lang="zh">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>已解除锁定</title></head>
<body style="font-family:sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0">
  <div style="text-align:center;padding:24px">
    <p style="font-size:22px">✅ 登录锁定已解除</p>
    <p>来源 IP ${escapeHtml(ip)} 现在可以重新登录管理后台。</p>
    <p><a href="/admin/guestbook">前往登录 →</a></p>
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
