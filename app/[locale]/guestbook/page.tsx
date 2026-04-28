import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { GuestbookClient } from "./guestbook-client";
import { RateLimitToast } from "@/components/rate-limit-toast";
// 💡 1. 引入必要的方法和限流工具
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// 💡 2. 在组件外部初始化严格的 API 限流器 (每分钟3次)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
const apiLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 m"),
});

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
    
    // 💡 3. 第一道关卡：精准的 Server Action 限流
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "127.0.0.1";
    const { success } = await apiLimit.limit(`ratelimit_api_${ip}`);

    // 如果超限，触发 Next.js 内置重定向（完美兼容客户端路由，不会红屏！）
    if (!success) {
      redirect(`/${locale}/guestbook?error=ratelimit`);
    }

    // 验证通过，继续处理留言逻辑
    const author = formData.get('author') as string;
    const title = formData.get('title') as string | null;
    const content = formData.get('content') as string;
    const reply_to_id = formData.get('reply_to_id') as string | null;
    const reply_to_author = formData.get('reply_to_author') as string | null;
    const reply_to_content = formData.get('reply_to_content') as string | null;

    if (!author || !content) return;

    const { error: insertError } = await supabase.from('guestbook').insert([{ 
      author, 
      title: reply_to_id ? null : title,
      content, 
      is_visible: true,
      reply_to_id,
      reply_to_author,
      reply_to_content
    }]);

    if (insertError) {
      console.error("❌ 写入留言失败:", insertError.message, insertError.details);
      return; 
    }
    
    revalidatePath('/guestbook');
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 animate-in fade-in duration-1000 mb-32">
      
      <RateLimitToast />

      <div className="mb-12 border-b border-stone-200 dark:border-stone-800 pb-12">
        <Link href="/" className="inline-flex items-center gap-2 text-xs tracking-wider uppercase font-medium text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors group mb-8">
          <svg className="w-3 h-3 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t("backHome")}
        </Link>
        <h1 className="text-5xl md:text-6xl font-serif text-stone-900 dark:text-stone-100 mb-4 transition-colors leading-[1.1]">{t("title")}</h1>
        <p className="text-stone-600 dark:text-stone-400 transition-colors font-light">{t("subtitle")}</p>
      </div>

      {error && <p className="text-red-600 dark:text-red-400 mb-8 text-sm">{t("list.error")} {error.message}</p>}

      <GuestbookClient 
        posts={posts} 
        currentPage={currentPage}
        totalPage={totalPage}
        addPost={addPost} 
        dateLocale={dateLocale} 
        allPostIds={allPostIds}
        pageSize={pageSize}
      />

      <div className="pt-16 mt-16 border-t border-stone-200 dark:border-stone-800 flex justify-start">
        <Link href="/" className="inline-flex items-center gap-2 text-xs tracking-wider uppercase font-medium text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors group">
          <svg className="w-3 h-3 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t("backHome")}
        </Link>
      </div>

    </div>
  );
}