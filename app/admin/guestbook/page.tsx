// 💡 1. 修改导入：使用拥有最高权限的 supabaseAdmin
import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  isAdminLocked,
  recordAdminFailure,
  resetAdminFailures,
  createAdminUnlockToken,
} from "@/lib/admin-guard";
import { sendLineAlert } from "@/lib/alert";
import { AdminThemeToggle } from "./admin-theme-toggle";
import { OwnerModeToggle } from "./owner-mode-toggle";
import { AdminTableClient } from "./admin-table-client";

export const dynamic = 'force-dynamic';

export default async function AdminGuestbookPage({ searchParams }: { searchParams: Promise<{ p?: string, error?: string }> }) {
  const { p, error: loginError } = await searchParams;
  
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin_session")?.value === process.env.ADMIN_PASSWORD;

  // --- 服务端动作：登录（2026-11-18 加防爆破：同 IP 15 分钟内错 5 次锁 15 分钟，
  // 触发锁定时给站长发 LINE 告警，内含一次性解锁链接） ---
  async function login(formData: FormData) {
    "use server";
    const password = formData.get("password");
    const ip =
      ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      "unknown";
    if (await isAdminLocked(ip)) {
      redirect("/admin/guestbook?error=locked");
    }
    if (password === process.env.ADMIN_PASSWORD) {
      await resetAdminFailures(ip);
      (await cookies()).set("admin_session", password as string, {
        httpOnly: true,
        maxAge: 60 * 60 * 24,
      });
      redirect("/admin/guestbook");
    }
    const lockedNow = await recordAdminFailure(ip);
    if (lockedNow) {
      const token = await createAdminUnlockToken(ip);
      const time = new Date().toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
      });
      await sendLineAlert(
        [
          "🔐 zeli-portfolio 后台登录告警",
          "管理后台在 15 分钟内连续输错密码 5 次，已锁定该来源 15 分钟。",
          `来源 IP: ${ip}`,
          `时间: ${time} (JST)`,
          "若不是你本人，说明有人在试你的后台密码，请留意。",
          ...(token
            ? [
                "若是你自己输错的，点此立即解除锁定（1 小时内有效、仅可使用一次）：",
                `https://zeli-portfolio.vercel.app/api/admin-unlock?token=${token}`,
              ]
            : []),
        ].join("\n"),
      );
      redirect("/admin/guestbook?error=locked");
    }
    redirect("/admin/guestbook?error=1");
  }

  // --- 服务端动作：退出 ---
  async function logout() {
    "use server";
    (await cookies()).delete("admin_session");
    redirect("/admin/guestbook");
  }

  // 【未登录状态】显示登录框
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors px-4">
        <div className="absolute top-6 right-6">
          <AdminThemeToggle />
        </div>
        <div className="w-full max-w-sm p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl transition-colors animate-in fade-in zoom-in duration-500">
          <h1 className="text-2xl font-bold mb-2 text-center text-slate-900 dark:text-slate-100">管理中枢</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">{`Zeli's Space`}</p>
          
          {loginError === '1' && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-bold text-center rounded-xl border border-red-100 dark:border-red-800/50 animate-in shake">
              ❌ 密码错误，请重试
            </div>
          )}

          {loginError === 'locked' && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-bold text-center rounded-xl border border-amber-100 dark:border-amber-800/50">
              🔒 登录失败次数过多，已锁定 15 分钟。若是你本人，可用站长 LINE 里的一次性链接立即解除。
            </div>
          )}

          <form action={login} className="space-y-5">
            <input 
              name="password" 
              type="password" 
              placeholder="请输入管理员密码" 
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none transition-colors"
            />
            <button type="submit" className="w-full py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer shadow-md">
              验证身份
            </button>
          </form>
          <div className="mt-6 text-center">
             <Link href="/cn/guestbook" className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors">
              ← 返回前台
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 【已登录状态】执行数据拉取与后台渲染
  const pageSize = 10;
  const currentPage = parseInt(p || "1");
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize - 1;

  // 💡 2. 使用 supabaseAdmin 拉取数据！现在可以无视 RLS 看到所有隐藏数据了
  const { data: posts, count, error } = await supabaseAdmin
    .from('guestbook')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end);

  const totalPage = Math.ceil((count || 0) / pageSize);

  // 💡 3. 下面所有的增删改操作，全部替换为了 supabaseAdmin
  async function toggleVisibilityAction(id: string, currentStatus: boolean) {
    'use server';
    await supabaseAdmin.from('guestbook').update({ is_visible: !currentStatus }).eq('id', id);
    revalidatePath('/admin/guestbook');
    revalidatePath('/guestbook');
  }

  async function updateVisibilityBulkAction(ids: string[], is_visible: boolean) {
    'use server';
    if (!ids || ids.length === 0) return;
    await supabaseAdmin.from('guestbook').update({ is_visible }).in('id', ids);
    revalidatePath('/admin/guestbook');
    revalidatePath('/guestbook');
  }

  // Server Action 2: 批量彻底删除
  async function deleteBulkAction(ids: string[]) {
    'use server';
    if (!ids || ids.length === 0) return;
    
    // 执行删除
    await supabaseAdmin.from('guestbook').delete().in('id', ids);
    
    // 清理两边的缓存，让数据更新
    revalidatePath('/admin/guestbook');
    revalidatePath('/guestbook');

    // 💡 修复：强制重定向回第一页（干净的 URL），防止停留在被删空的页码上
    redirect('/admin/guestbook');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-6 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
        
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">留言板管理中枢</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">共 {count || 0} 条数据。当前第 {currentPage} 页。</p>
          </div>
          <div className="flex items-center gap-3">
            <AdminThemeToggle />
            
            {/* 💡 新增：通往监控面板的快捷按钮 */}
            <Link 
              href="/admin/monitor" 
              className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/30 rounded-lg text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors shadow-sm"
            >
              🛡️ 监控大屏
            </Link>

            <form action={logout}>
              <button type="submit" className="px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer">
                安全退出
              </button>
            </form>
            <Link href="/cn/guestbook" className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm">
              返回前台 →
            </Link>
          </div>
        </header>

        <OwnerModeToggle />

        {error && <div className="p-4 bg-red-100 text-red-600 rounded-lg shadow-sm">数据拉取失败: {error.message}</div>}

        <AdminTableClient 
          posts={posts || []}
          currentPage={currentPage}
          totalPage={totalPage}
          count={count}
          toggleVisibilityAction={toggleVisibilityAction}
          updateVisibilityBulkAction={updateVisibilityBulkAction}
          deleteBulkAction={deleteBulkAction}
        />

      </div>
    </div>
  );
}