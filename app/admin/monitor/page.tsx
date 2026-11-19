import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminThemeToggle } from "../guestbook/admin-theme-toggle"; // 复用你的暗黑模式按钮
import { getGroqQuota, getGeminiStatus, getLastProbeAt, probeQuota } from "@/lib/ling/quota";
import { getRecentVisits } from "@/lib/visits";
import { QuotaAutoRefresh } from "./quota-auto-refresh";
import { ProbeButton } from "./probe-button";
// 💡 1. 顶部引入 Redis
import { Redis } from "@upstash/redis";
import { reportInfraFailure } from "@/lib/alert";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  signal: () => AbortSignal.timeout(2500), // 硬超时，理由同 middleware
});

// 💡 修复 1：明确告诉 TypeScript 数据库返回的字段格式
interface BlockRecord {
  ip: string;
  reason: string | null;
  created_at: string;
}

export const dynamic = 'force-dynamic';

export default async function MonitorDashboardPage() {
  // 1. 【安全检查】确认管理员身份
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin_session")?.value === process.env.ADMIN_PASSWORD;

  if (!isAdmin) {
    redirect("/admin/guestbook"); // 未登录直接踢回登录页
  }

  // 2. 拉取黑名单数据
  const { data: blocklist, error } = await supabaseAdmin
    .from('ip_blocklist')
    .select('*')
    .order('created_at', { ascending: false });

  // --- Server Action: 手动封禁 IP ---
  async function banIp(formData: FormData) {
    "use server";
    const ip = formData.get("ip") as string;
    const reason = formData.get("reason") as string || "管理员手动封禁";
    if (!ip) return;

    // A. 存入数据库（永久记录）
    await supabaseAdmin.from('ip_blocklist').upsert([{ ip, reason }]);
    
    // B. 💡 同步到 Redis（高速拦截），设置过期时间为永久（或很久）
    // 容错：Redis 同步失败只告警——Supabase 里的永久记录已落库，不能让整个操作报错。
    try {
      await redis.set(`blocked_ip:${ip}`, reason);
    } catch (err) {
      await reportInfraFailure('monitor/redis', err);
    }
    
    revalidatePath("/admin/monitor");
  }

  // --- Server Action: 解除封禁 ---
  async function unbanIp(formData: FormData) {
    "use server";
    const ip = formData.get("ip") as string;
    
    // A. 从数据库删除
    await supabaseAdmin.from('ip_blocklist').delete().eq('ip', ip);
    
    // B. 💡 从 Redis 删除（容错同上：失败只告警）
    try {
      await redis.del(`blocked_ip:${ip}`);
    } catch (err) {
      await reportInfraFailure('monitor/redis', err);
    }
    
    revalidatePath("/admin/monitor");
  }

  // --- 近 7 天访客 IP（2026-11-19 站长要求：按不同 IP 统计，滚动 7 天）---
  const visits = await getRecentVisits(7);

  // --- 聊天额度快照（2026-11-19 站长要求：管理员界面实时剩余额度）---
  const groqQuota = await getGroqQuota();
  const geminiStatus = await getGeminiStatus();
  const lastProbeAt = await getLastProbeAt();

  // --- Server Action: 立即探测两家供应商，刷新额度快照 ---
  async function probeQuotaAction() {
    "use server";
    await probeQuota();
    revalidatePath("/admin/monitor");
  }

  const fmtTime = (iso: string | null | undefined) =>
    iso
      ? new Intl.DateTimeFormat("zh-CN", {
          timeZone: "Asia/Tokyo",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date(iso))
      : "—";
  const ageText = (iso: string | null | undefined) => {
    if (!iso) return "";
    const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    return mins <= 0 ? "刚刚" : `${mins} 分钟前`;
  };
  const groqPct =
    groqQuota?.remainingTokens != null && groqQuota?.limitTokens
      ? Math.max(0, Math.min(100, Math.round((groqQuota.remainingTokens / groqQuota.limitTokens) * 100)))
      : null;
  const groqBarColor = groqPct == null ? "bg-slate-300" : groqPct > 50 ? "bg-emerald-500" : groqPct >= 20 ? "bg-amber-500" : "bg-red-500";
  const geminiDown =
    geminiStatus?.lastErrorAt != null &&
    (geminiStatus?.lastOkAt == null || geminiStatus.lastErrorAt > geminiStatus.lastOkAt);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-6 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
        
        {/* 顶部导航 */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              🛡️ 流量与安全监控
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">管理系统黑名单，保护接口安全</p>
          </div>
          <div className="flex items-center gap-3">
            <AdminThemeToggle />
            <Link href="/admin/guestbook" className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm">
              ← 返回留言管理
            </Link>
          </div>
        </header>

        {/* 聊天额度（实时）：Groq 剩余量来自其响应头快照，聊天一次刷新一次；
            Gemini 免费档无额度接口，只显示最近可用状态。每 30 秒自动刷新本页。 */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
          <QuotaAutoRefresh seconds={30} />
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">💬 聊天额度（实时）</h2>
            <div className="flex items-center gap-3">
              {lastProbeAt && <span className="text-xs text-slate-400">上次探测 {fmtTime(lastProbeAt)}</span>}
              <form action={probeQuotaAction}>
                <ProbeButton />
              </form>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Groq（主力 · gpt-oss-120b）</h3>
                {groqPct != null && <span className="text-sm text-slate-500 dark:text-slate-400">剩余 {groqPct}%</span>}
              </div>
              {groqQuota ? (
                <>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {groqQuota.remainingTokens?.toLocaleString() ?? "—"}
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400"> / {groqQuota.limitTokens?.toLocaleString() ?? "—"} 词元（每日）</span>
                  </p>
                  <div className="mt-2 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className={`h-full ${groqBarColor}`} style={{ width: `${groqPct ?? 0}%` }} />
                  </div>
                  <dl className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between"><dt>请求剩余（每日）</dt><dd>{groqQuota.remainingRequests?.toLocaleString() ?? "—"} / {groqQuota.limitRequests?.toLocaleString() ?? "—"}</dd></div>
                    <div className="flex justify-between"><dt>词元窗口重置</dt><dd>{groqQuota.resetTokens ?? "—"}</dd></div>
                    <div className="flex justify-between"><dt>数据时间</dt><dd>{fmtTime(groqQuota.capturedAt)}（{ageText(groqQuota.capturedAt)} · 来自{groqQuota.source === "probe" ? "手动探测" : "聊天请求"}）</dd></div>
                  </dl>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">暂无数据——等一次聊天请求，或点「立即探测」。</p>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Gemini（兜底 · Flash-Lite）</h3>
              {geminiStatus ? (
                <>
                  <p className="mt-2 text-2xl font-bold">
                    {geminiDown ? <span className="text-red-500">最近失败</span> : <span className="text-emerald-500">可用</span>}
                  </p>
                  <dl className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between"><dt>最近成功</dt><dd>{fmtTime(geminiStatus.lastOkAt)}</dd></div>
                    <div className="flex justify-between"><dt>最近失败</dt><dd>{geminiStatus.lastErrorAt ? `${fmtTime(geminiStatus.lastErrorAt)}（${geminiStatus.lastErrorKind ?? ""}）` : "—"}</dd></div>
                    <div className="flex justify-between"><dt>数据时间</dt><dd>{fmtTime(geminiStatus.capturedAt)}（{ageText(geminiStatus.capturedAt)} · 来自{geminiStatus.source === "probe" ? "手动探测" : "聊天请求"}）</dd></div>
                  </dl>
                  <p className="mt-3 text-xs text-slate-400">免费档没有官方剩余额度接口，只能显示可用状态；已知参考线：约 15 次/分钟、25 万词元/分钟、500 次/天。</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">暂无数据——等一次兜底调用，或点「立即探测」。</p>
              )}
            </div>
          </div>
        </section>

        {/* 近 7 天访客：按不同 IP 统计（middleware 按 JST 日期记录，8 天自动过期）。
            位置为 IP 定位：国家 · 一级行政区（省/县/州）· 城市。本页每 30 秒自动刷新。 */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">👥 近 7 天访客（按不同 IP）</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              今日访客 <span className="font-bold text-slate-900 dark:text-slate-100">{visits.todayCount}</span> 个不同 IP
              · 7 天去重共 <span className="font-bold text-slate-900 dark:text-slate-100">{visits.uniqueTotal}</span> 个
            </p>
          </div>
          <div className="space-y-4">
            {visits.days.map((day, i) => (
              <div key={day.date} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {day.date.slice(5).replace("-", "/")}
                    {i === 0 && <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">今天</span>}
                    {i === 1 && <span className="ml-2 text-xs text-slate-400">昨天</span>}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{day.entries.length} 个不同 IP</span>
                </div>
                {day.entries.length === 0 ? (
                  <p className="text-sm text-slate-400">暂无记录</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {day.entries.map((e) => (
                      <li key={e.ip} className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{e.ip}</span>
                        <span className="ml-2 text-slate-500 dark:text-slate-400">{e.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">记录始于本功能上线时刻；位置来自 IP 定位（ipwho.is），城市级精度因运营商而异，VPN / 代理会显示出口所在地。</p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* 左侧：操作面板 */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">手动封禁 IP</h2>
              <form action={banIp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">IPv4 地址</label>
                  <input 
                    type="text" 
                    name="ip" 
                    placeholder="例如: 192.168.1.1" 
                    required
                    pattern="^([0-9]{1,3}\.){3}[0-9]{1,3}$"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-red-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">封禁原因 (可选)</label>
                  <input 
                    type="text" 
                    name="reason" 
                    placeholder="例如: 恶意爬虫" 
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-red-500 outline-none transition-colors"
                  />
                </div>
                <button type="submit" className="w-full py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer border border-red-100 dark:border-red-800/50">
                  执行封禁
                </button>
              </form>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800/30">
              <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">ℹ️ 防御系统状态</h3>
              <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-2">
                <li>• 边缘节点 (Edge) 限流已激活</li>
                <li>• 留言接口限流: 3次/分钟</li>
                <li>• 全局访问限流: 600次/分钟</li>
              </ul>
            </div>
          </div>

          {/* 右侧：黑名单列表 */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">当前封禁列表</h2>
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-full">
                共 {blocklist?.length || 0} 个记录
              </span>
            </div>
            
            {error && <div className="p-4 text-red-500 text-sm">数据加载失败: {error.message}</div>}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="p-4 font-medium">IP 地址</th>
                    <th className="p-4 font-medium">封禁原因</th>
                    <th className="p-4 font-medium">封禁时间</th>
                    <th className="p-4 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {blocklist?.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500 text-sm">
                        🎉 当前没有任何被封禁的 IP
                      </td>
                    </tr>
                  ) : (
                    blocklist?.map((record: BlockRecord) => (
                      <tr key={record.ip} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="p-4 font-mono text-sm font-bold text-red-600 dark:text-red-400">{record.ip}</td>
                        <td className="p-4 text-sm text-slate-700 dark:text-slate-300">{record.reason}</td>
                        <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                          {new Date(record.created_at).toLocaleString('zh-CN')}
                        </td>
                        <td className="p-4 text-right">
                          <form action={unbanIp}>
                            <input type="hidden" name="ip" value={record.ip} />
                            <button type="submit" className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                              解除封禁
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}