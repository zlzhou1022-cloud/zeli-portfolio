"use client";

import { useState, useRef, useEffect } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
// 1. 新增引入 useTranslations
import { useTranslations } from "next-intl";

export interface Post {
  id: string;
  author: string;
  title: string | null;
  content: string;
  created_at: string;
  is_visible: boolean;
  reply_to_id?: string | null;
  reply_to_author?: string | null;
  reply_to_content?: string | null;
}

interface GuestbookClientProps {
  posts: Post[] | null;
  currentPage: number;
  totalPage: number;
  addPost: (formData: FormData) => void;
  // 2. 去掉这里的 t 
  dateLocale: string;
  allPostIds: string[];
  pageSize: number;
}

export function GuestbookClient({ 
  posts, 
  currentPage, 
  totalPage, 
  addPost, 
  dateLocale, 
  allPostIds, 
  pageSize 
}: GuestbookClientProps) {
  
  // 3. 在客户端组件内部直接获取翻译钩子
  const t = useTranslations("GuestbookPage");

  const [replyTarget, setReplyTarget] = useState<Post | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId) {
      setTimeout(() => {
        const el = document.getElementById(`post-${highlightId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-emerald-500', 'scale-[1.02]');
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-emerald-500', 'scale-[1.02]');
          }, 1500);
          
          const newParams = new URLSearchParams(searchParams.toString());
          newParams.delete('highlight');
          const newUrl = newParams.toString() ? `${window.location.pathname}?${newParams.toString()}` : window.location.pathname;
          window.history.replaceState(null, '', newUrl);
        }
      }, 150);
    }
  }, [searchParams]);

  const handleReply = (post: Post) => {
    setReplyTarget(post);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleScrollToOriginal = (id: string) => {
    // 💡 核心修复：把双方都强制转换为字符串再比较，无视 number 和 string 的壁垒
    const index = allPostIds.findIndex(postId => String(postId) === String(id));
    
    if (index === -1) {
      alert(t("list.notFound"));
      return;
    }

    const targetPage = Math.floor(index / pageSize) + 1;

    if (targetPage === currentPage) {
      const el = document.getElementById(`post-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-emerald-500', 'scale-[1.02]');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-emerald-500', 'scale-[1.02]');
        }, 1500);
      }
    } else {
      router.push(`/guestbook?p=${targetPage}&highlight=${id}`);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPage, currentPage + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-12 transition-colors">
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 transition-colors">
            {replyTarget ? `${t("form.replyingTo")} @${replyTarget.author}` : t("form.title")}
          </h2>
          {replyTarget && (
            <button onClick={() => setReplyTarget(null)} className="text-sm text-red-500 hover:text-red-600 font-medium cursor-pointer">
              {t("form.cancelReply")}
            </button>
          )}
        </div>

        <form ref={formRef} action={(formData) => {
          addPost(formData);
          setReplyTarget(null);
          (formRef.current as HTMLFormElement)?.reset();
        }} className="space-y-4">
          
          {replyTarget && (
            <>
              <input type="hidden" name="reply_to_id" value={replyTarget.id} />
              <input type="hidden" name="reply_to_author" value={replyTarget.author} />
              <input type="hidden" name="reply_to_content" value={replyTarget.content || ""} />
            </>
          )}

          <div className="flex gap-4">
            <input required name="author" type="text" placeholder={t("form.authorPlaceholder")} className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors" />
            
            {!replyTarget && (
              <input name="title" type="text" placeholder={t("form.titlePlaceholder")} className="flex-2 w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors" />
            )}
          </div>
          
          <textarea required name="content" placeholder={t("form.contentPlaceholder")} rows={3} className="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none transition-colors"></textarea>
          
          <button type="submit" className="px-6 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors font-bold cursor-pointer">
            {replyTarget ? t("form.replySubmit") : t("form.submit")}
          </button>
        </form>
      </div>

      <div className="space-y-6 mb-12">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2 transition-colors">{t("list.title")}</h2>
        
        {!posts || posts.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 italic transition-colors">{t("list.empty")}</p>
        ) : (
          posts.map((post: Post) => (
            <div 
              key={post.id} 
              id={`post-${post.id}`}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-500"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
                    {post.author.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-base">{post.author}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(post.created_at).toLocaleDateString(dateLocale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <button onClick={() => handleReply(post)} className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                  {t("list.replyBtn")}
                </button>
              </div>

              {post.reply_to_id && (
                // 💡 修复：使用 .some() 配合 String() 强制统一两边的类型再比较
                allPostIds.some(id => String(id) === String(post.reply_to_id)) ? (
                  /* 原消息存在：正常显示并允许点击跳转 */
                  <div 
                    onClick={() => handleScrollToOriginal(post.reply_to_id as string)}
                    className="mb-4 pl-3 py-2 border-l-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-r-lg cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/40 transition-colors group"
                  >
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500 mb-1 group-hover:underline">
                      {t("list.quotePrefix")} @{post.reply_to_author} :
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 italic">
                      {post.reply_to_content}
                    </p>
                  </div>
                ) : (
                  /* 原消息不存在：显示灰色失效提示 */
                  <div className="mb-4 pl-3 py-2 border-l-4 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-r-lg">
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                      {t("list.notFound")}
                    </p>
                  </div>
                )
              )}

              {post.title && <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">{post.title}</h3>}
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{post.content}</p>
            </div>
          ))
        )}
      </div>

      {totalPage > 1 && (
        <div className="flex items-center justify-center gap-2 mb-8">
          <Link 
            href={`/guestbook?p=${Math.max(1, currentPage - 1)}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentPage === 1 ? 'pointer-events-none opacity-30' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            ← {t("pagination.prev")}
          </Link>

          {getPageNumbers().map(num => (
            <Link
              key={num}
              href={`/guestbook?p=${num}`}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                num === currentPage 
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 scale-110' 
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {num}
            </Link>
          ))}

          <Link 
            href={`/guestbook?p=${Math.min(totalPage, currentPage + 1)}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentPage === totalPage ? 'pointer-events-none opacity-30' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            {t("pagination.next")} →
          </Link>
        </div>
      )}
    </>
  );
}