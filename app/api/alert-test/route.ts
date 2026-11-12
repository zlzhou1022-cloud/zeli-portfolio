import { NextResponse } from "next/server";
import { reportInfraFailure } from "@/lib/alert";

// 告警通道手动测试端点
// 用法（站长本人）：浏览器打开 /api/alert-test?key=<ADMIN_PASSWORD>
// 密码对了就立刻给站长发一条 LINE 测试消息（文案带 🧪，不会误报故障）。
// 密码不对或未设置 ADMIN_PASSWORD 时一律 401，不做任何事。
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || searchParams.get("key") !== expected) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  await reportInfraFailure("test/manual", new Error("手动测试触发"), { test: true });

  return NextResponse.json({
    ok: true,
    hint: "若 Vercel 已为 Production 配置 LINE_CHANNEL_ACCESS_TOKEN 与 LINE_ALERT_USER_ID 并重新部署，站长应已收到 🧪 测试消息；若未配置，告警仅写入日志。",
  });
}
