import { NextResponse } from "next/server";
import {
  peekAdminUnlockToken,
  consumeAdminUnlockToken,
} from "@/lib/admin-guard";

// 后台登录锁定的一次性解除端点（2026-11-18）：链接只通过站长的 LINE 告警发出，
// 令牌 64 位随机串、1 小时过期、用一次即焚；无效令牌一律 401，不透露任何信息。
// 两步式（同日晚修复）：GET 只验不销、展示确认页——LINE 的链接预览会先替用户 GET 一次，
// 若 GET 即消费，站长点开时令牌已死。真正的消费只发生在确认按钮的 POST。
export const dynamic = "force-dynamic";

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function page(body: string, status = 200): NextResponse {
  const html = `<!doctype html>
<html lang="zh">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>解除登录锁定</title></head>
<body style="font-family:sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0">
  <div style="text-align:center;padding:24px;max-width:420px">
    ${body}
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function invalid(): NextResponse {
  return new NextResponse("链接无效或已过期", {
    status: 401,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const ip = token ? await peekAdminUnlockToken(token) : null;
  if (!ip) return invalid();
  return page(`
    <p style="font-size:22px">🔓 解除登录锁定？</p>
    <p>将解除来源 IP ${escapeHtml(ip)} 的后台登录锁定（该来源此前连续输错密码 5 次）。</p>
    <p>只有你本人能收到这条链接。若不是你触发的，请勿点击，直接关闭本页即可。</p>
    <form method="POST" action="/api/admin-unlock">
      <input type="hidden" name="token" value="${escapeHtml(token)}">
      <button type="submit" style="font-size:16px;padding:12px 28px;border-radius:10px;border:0;background:#111827;color:#fff;cursor:pointer">确认解除锁定</button>
    </form>
  `);
}

export async function POST(req: Request) {
  let token = "";
  try {
    const form = await req.formData();
    token = String(form.get("token") ?? "");
  } catch {
    token = "";
  }
  const ip = token ? await consumeAdminUnlockToken(token) : null;
  if (!ip) return invalid();
  return page(`
    <p style="font-size:22px">✅ 登录锁定已解除</p>
    <p>来源 IP ${escapeHtml(ip)} 现在可以重新登录管理后台。</p>
    <p><a href="/admin/guestbook">前往登录 →</a></p>
  `);
}
