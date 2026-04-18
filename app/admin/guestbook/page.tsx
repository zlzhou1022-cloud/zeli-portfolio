import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { cookies } from "next/headers";
// 💡 1. 引入 redirect 用于处理登录失败的跳转
import { redirect } from "next/navigation"; 
import { AdminThemeToggle } from "./admin-theme-toggle";
import { AdminTableClient } from "./admin-table-client";

export const dynamic = 'force-dynamic';

export default async function AdminGuestbookPage({ searchParams }: { searchParams: Promise<{ p?: string, error?: string }> }) {
  // 解析参数，获取错误标识
  const { p, error: loginError } = await searchParams;
  
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin_session")?.value === process.env.ADMIN_PASSWORD;

  // --- 服务端动作：登录 ---
  async function login(formData: FormData) {
    "use server";
    const password = formData.get("password");
    if (password === process.env.ADMIN_PASSWORD) {
      (await cookies()).set("admin_session", password as string, {
        httpOnly: true,
        maxAge: 60 * 60 * 24, 
      });
      // 登录成功时，重定向到干净的后台 URL，清除错误参数
      redirect("/admin/guestbook");
    } else {
      // 💡 2. 密码错误时，重定向并带上 error 参数
      redirect("/admin/guestbook?error=1");
    }
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
          
          {/* 💡 3. 捕捉 URL 里的错误参数，显示红色提示 */}
          {loginError === '1' && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-bold text-center rounded-xl border border-red-100 dark:border-red-800/50 animate-in shake">
              ❌ 密码错误，请重试
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

  const { data: posts, count, error } = await supabase
    .from('guestbook')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end);

  const totalPage = Math.ceil((count || 0) / pageSize);

  // Server Action 1: 切换单个显示状态
  async function toggleVisibilityAction(id: string, currentStatus: boolean) {
    'use server';
    await supabase.from('guestbook').update({ is_visible: !currentStatus }).eq('id', id);
    revalidatePath('/admin/guestbook');
    revalidatePath('/guestbook');
  }

  // 💡 4. 新增 Server Action 3: 批量修改显示状态
  async function updateVisibilityBulkAction(ids: string[], is_visible: boolean) {
    'use server';
    if (!ids || ids.length === 0) return;
    await supabase.from('guestbook').update({ is_visible }).in('id', ids);
    revalidatePath('/admin/guestbook');
    revalidatePath('/guestbook');
  }

  // Server Action 2: 批量彻底删除
  async function deleteBulkAction(ids: string[]) {
    'use server';
    if (!ids || ids.length === 0) return;
    await supabase.from('guestbook').delete().in('id', ids);
    revalidatePath('/admin/guestbook');
    revalidatePath('/guestbook');
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

        {error && <div className="p-4 bg-red-100 text-red-600 rounded-lg shadow-sm">数据拉取失败: {error.message}</div>}

        <AdminTableClient 
          posts={posts || []}
          currentPage={currentPage}
          totalPage={totalPage}
          count={count}
          toggleVisibilityAction={toggleVisibilityAction}
          updateVisibilityBulkAction={updateVisibilityBulkAction} // 传给客户端
          deleteBulkAction={deleteBulkAction}
        />

      </div>
    </div>
  );
}