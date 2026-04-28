"use client";

import { useState } from "react";
// 🛠️ 注意：改用我们配置的国际化导航钩子
import { useRouter, Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface Props {
  tripId: string;
  currentPage: number;
  totalPage: number;
}

export function TravelPagination({ tripId, currentPage, totalPage }: Props) {
  const router = useRouter();
  const t = useTranslations("TripDetail");
  const [jumpValue, setJumpValue] = useState("");
  const [error, setError] = useState("");

  const handleJump = () => {
    const pageNum = parseInt(jumpValue);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPage) {
      // 🛠️ 动态传入参数给翻译字符串
      setError(t("error", { max: totalPage }));
      setTimeout(() => setError(""), 3000);
      return;
    }
    // 这里的 href 不需要写语言前缀，i18n router 会自动处理
    router.push(`/travels/${tripId}?p=${pageNum}`);
    setJumpValue("");
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
    <div className="space-y-8 mt-16 pb-20">
      {/* 报错提示 */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4">
          <div className="bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-6 py-2 shadow-xl text-xs tracking-wider uppercase font-medium">
            {error}
          </div>
        </div>
      )}

      {/* 数字分页条 */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link 
          href={`/travels/${tripId}?p=${Math.max(1, currentPage - 1)}`}
          className={`px-3 py-1.5 text-xs tracking-wider uppercase font-medium transition-colors border border-stone-200 dark:border-stone-800 ${currentPage === 1 ? 'pointer-events-none opacity-30' : 'hover:border-stone-400 dark:hover:border-stone-600'}`}
        >
          ← {t("prev")}
        </Link>

        {getPageNumbers().map(num => (
          <Link
            key={num}
            href={`/travels/${tripId}?p=${num}`}
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
          href={`/travels/${tripId}?p=${Math.min(totalPage, currentPage + 1)}`}
          className={`px-3 py-1.5 text-xs tracking-wider uppercase font-medium transition-colors border border-stone-200 dark:border-stone-800 ${currentPage === totalPage ? 'pointer-events-none opacity-30' : 'hover:border-stone-400 dark:hover:border-stone-600'}`}
        >
          {t("next")} →
        </Link>
      </div>

      {/* 跳转输入框 */}
      <div className="flex items-center justify-center gap-2">
        <input 
          type="text"
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          placeholder={`1 ~ ${totalPage}`}
          className="w-20 px-3 py-1.5 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-xs outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors font-light"
        />
        <button 
          onClick={handleJump}
          className="px-4 py-1.5 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs tracking-wider uppercase font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors cursor-pointer"
        >
          {t("jump")}
        </button>
      </div>
    </div>
  );
}