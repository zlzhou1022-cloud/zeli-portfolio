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
    <div className="space-y-8 mt-12 pb-20">
      {/* 报错提示 */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4">
          <div className="bg-red-500 text-white px-6 py-2 rounded-full shadow-lg text-sm font-bold">
            ⚠️ {error}
          </div>
        </div>
      )}

      {/* 数字分页条 */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link 
          href={`/travels/${tripId}?p=${Math.max(1, currentPage - 1)}`}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentPage === 1 ? 'pointer-events-none opacity-30' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          ← {t("prev")}
        </Link>

        {getPageNumbers().map(num => (
          <Link
            key={num}
            href={`/travels/${tripId}?p=${num}`}
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
          href={`/travels/${tripId}?p=${Math.min(totalPage, currentPage + 1)}`}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentPage === totalPage ? 'pointer-events-none opacity-30' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
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
          className="w-20 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-colors"
        />
        <button 
          onClick={handleJump}
          className="px-4 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-bold hover:opacity-80 transition-opacity cursor-pointer"
        >
          {t("jump")}
        </button>
      </div>
    </div>
  );
}