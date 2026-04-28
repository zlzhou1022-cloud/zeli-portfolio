"use client";

import { useState, useRef, useEffect } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
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
          el.classList.add('ring-2', 'ring-stone-900', 'dark:ring-stone-100');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-stone-900', 'dark:ring-stone-100');
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
        el.classList.add('ring-2', 'ring-stone-900', 'dark:ring-stone-100');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-stone-900', 'dark:ring-stone-100');
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
      <div className="border border-stone-200 dark:border-stone-800 p-8 mb-16 transition-colors bg-white dark:bg-stone-950">
        
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-stone-200 dark:border-stone-800">
          <h2 className="text-lg font-serif text-stone-900 dark:text-stone-100 transition-colors">
            {replyTarget ? `${t("form.replyingTo")} @${replyTarget.author}` : t("form.title")}
          </h2>
          {replyTarget && (
            <button onClick={() => setReplyTarget(null)} className="text-xs tracking-wider uppercase font-medium text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required name="author" type="text" placeholder={t("form.authorPlaceholder")} className="px-4 py-2.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors font-light text-sm" />
            
            {!replyTarget && (
              <input name="title" type="text" placeholder={t("form.titlePlaceholder")} className="px-4 py-2.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors font-light text-sm" />
            )}
          </div>
          
          <textarea required name="content" placeholder={t("form.contentPlaceholder")} rows={4} className="w-full px-4 py-2.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-stone-400 dark:focus:border-stone-600 resize-none transition-colors font-light text-sm leading-relaxed"></textarea>
          
          <button type="submit" className="px-6 py-2.5 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors text-xs tracking-wider uppercase font-medium cursor-pointer">
            {replyTarget ? t("form.replySubmit") : t("form.submit")}
          </button>
        </form>
      </div>

      <div className="space-y-1 mb-16">
        <h2 className="text-xs tracking-[0.2em] uppercase text-stone-400 dark:text-stone-500 font-medium mb-8">{t("list.title")}</h2>
        
        {!posts || posts.length === 0 ? (
          <p className="text-stone-500 dark:text-stone-400 italic transition-colors font-light text-sm py-12 text-center">{t("list.empty")}</p>
        ) : (
          posts.map((post: Post) => (
            <div 
              key={post.id} 
              id={`post-${post.id}`}
              className="border-b border-stone-200 dark:border-stone-800 py-8 transition-all duration-500 hover:bg-stone-50 dark:hover:bg-stone-900/50 px-6 -mx-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 border border-stone-200 dark:border-stone-800 flex items-center justify-center text-stone-900 dark:text-stone-100 font-serif text-lg shrink-0">
                    {post.author.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-stone-900 dark:text-stone-100 text-sm">{post.author}</div>
                    <div className="text-[10px] tracking-wider uppercase text-stone-400 dark:text-stone-500 mt-0.5">
                      {new Date(post.created_at).toLocaleDateString(dateLocale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <button onClick={() => handleReply(post)} className="text-xs tracking-wider uppercase font-medium text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors flex items-center gap-1.5 cursor-pointer">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                  {t("list.replyBtn")}
                </button>
              </div>

              {post.reply_to_id && (
                allPostIds.some(id => String(id) === String(post.reply_to_id)) ? (
                  <div 
                    onClick={() => handleScrollToOriginal(post.reply_to_id as string)}
                    className="mb-4 pl-4 py-3 border-l-2 border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/50 cursor-pointer hover:border-stone-900 dark:hover:border-stone-100 transition-colors group"
                  >
                    <p className="text-[10px] tracking-wider uppercase text-stone-400 dark:text-stone-500 mb-2 group-hover:text-stone-900 dark:group-hover:text-stone-100">
                      {t("list.quotePrefix")} @{post.reply_to_author}
                    </p>
                    <p className="text-sm text-stone-600 dark:text-stone-400 line-clamp-2 font-light italic">
                      {post.reply_to_content}
                    </p>
                  </div>
                ) : (
                  <div className="mb-4 pl-4 py-3 border-l-2 border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
                    <p className="text-sm text-stone-400 dark:text-stone-500 italic flex items-center gap-2 font-light">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                      {t("list.notFound")}
                    </p>
                  </div>
                )
              )}

              {post.title && <h3 className="font-serif text-lg text-stone-900 dark:text-stone-100 mb-3">{post.title}</h3>}
              <p className="text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap font-light text-sm">{post.content}</p>
            </div>
          ))
        )}
      </div>

      {totalPage > 1 && (
        <div className="flex items-center justify-center gap-2 mb-8">
          <Link 
            href={`/guestbook?p=${Math.max(1, currentPage - 1)}`}
            className={`px-3 py-1.5 text-xs tracking-wider uppercase font-medium transition-colors border border-stone-200 dark:border-stone-800 ${currentPage === 1 ? 'pointer-events-none opacity-30' : 'hover:border-stone-400 dark:hover:border-stone-600'}`}
          >
            ← {t("pagination.prev")}
          </Link>

          {getPageNumbers().map(num => (
            <Link
              key={num}
              href={`/guestbook?p=${num}`}
              className={`w-9 h-9 flex items-center justify-center text-xs font-medium transition-all border ${
                num === currentPage 
                ? 'bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 border-stone-900 dark:border-stone-100' 
                : 'border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600'
              }`}
            >
              {num}
            </Link>
          ))}

          <Link 
            href={`/guestbook?p=${Math.min(totalPage, currentPage + 1)}`}
            className={`px-3 py-1.5 text-xs tracking-wider uppercase font-medium transition-colors border border-stone-200 dark:border-stone-800 ${currentPage === totalPage ? 'pointer-events-none opacity-30' : 'hover:border-stone-400 dark:hover:border-stone-600'}`}
          >
            {t("pagination.next")} →
          </Link>
        </div>
      )}
    </>
  );
}
