import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { GuestbookClient } from "./guestbook-client";

export default async function GuestbookPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const t = await getTranslations("GuestbookPage");
  const locale = await getLocale();
  const dateLocale = locale === 'cn' ? 'zh-CN' : locale === 'jp' ? 'ja-JP' : 'en-US';
  
  const pageSize = 5;
  const currentPage = parseInt(p || "1");
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize - 1;

  const { data: posts, count, error } = await supabase
    .from('guestbook')
    .select('*', { count: 'exact' })
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .range(start, end);

  const totalPage = Math.ceil((count || 0) / pageSize);

  const { data: allIds } = await supabase
    .from('guestbook')
    .select('id')
    .eq('is_visible', true)
    .order('created_at', { ascending: false });
  
  const allPostIds = allIds?.map(row => row.id) || [];

  // Server Action：提交数据到 DB
  async function addPost(formData: FormData) {
    'use server'; 
    const author = formData.get('author') as string;
    const title = formData.get('title') as string | null;
    const content = formData.get('content') as string;
    
    // 获取隐藏的引用信息
    const reply_to_id = formData.get('reply_to_id') as string | null;
    const reply_to_author = formData.get('reply_to_author') as string | null;
    const reply_to_content = formData.get('reply_to_content') as string | null;

    if (!author || !content) return;

    // 接收 Supabase 返回的 error 对象
    const { error: insertError } = await supabase.from('guestbook').insert([{ 
      author, 
      title: reply_to_id ? null : title, // 如果是回复，强制标题为空
      content, 
      is_visible: true,
      reply_to_id,
      reply_to_author,
      reply_to_content
    }]);

    // 🛠️ 护城河：如果有报错，直接在运行 npm run dev 的终端里打印出来！
    if (insertError) {
      console.error("❌ 写入留言失败:", insertError.message, insertError.details);
      return; 
    }
    
    revalidatePath('/guestbook');
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 animate-in slide-in-from-bottom-4 duration-700 mb-20">
      
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors group">
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t("backHome")}
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2 transition-colors">{t("title")}</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8 transition-colors">{t("subtitle")}</p>

      {error && <p className="text-red-500 dark:text-red-400 mb-4">{t("list.error")} {error.message}</p>}

      {/* 注意：去掉了 t={t} */}
      <GuestbookClient 
        posts={posts} 
        currentPage={currentPage}
        totalPage={totalPage}
        addPost={addPost} 
        dateLocale={dateLocale} 
        allPostIds={allPostIds}
        pageSize={pageSize}
      />

      <div className="pt-8 mt-12 border-t border-slate-200 dark:border-slate-800 flex justify-center">
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all hover:scale-105 active:scale-95 cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t("backHome")}
        </Link>
      </div>

    </div>
  );
}