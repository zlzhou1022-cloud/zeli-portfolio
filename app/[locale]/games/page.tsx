import Link from "next/link";
import { useTranslations } from "next-intl";
import { GamesDashEntry } from "@/components/lab-game-entry";
import { GamesStampEntry } from "@/components/lab-stamp-entry";
import { GamesRoomEntry } from "@/components/room-entry";

// 小游戏专区（站长 2026-11-14 改版）：原来挂在 Lab 页的两个游戏入口搬到这里
// 独立成页，首页有专门的模块卡片通向本页。
export default function GamesPage() {
  const t = useTranslations("GamesPage");

  return (
    <div className="max-w-5xl mx-auto space-y-16 animate-in fade-in duration-1000 mt-8 mb-32">
      {/* 顶部标题区域 */}
      <header className="border-b border-stone-200 dark:border-stone-800 pb-12">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-xs tracking-wider uppercase font-medium text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors group mb-8">
            <svg className="w-3 h-3 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t("backHome")}
          </Link>
          <h1 className="text-5xl md:text-6xl font-serif text-stone-900 dark:text-stone-100 transition-colors mb-4 leading-[1.1]">{t("title")}</h1>
        </div>
        <p className="text-stone-600 dark:text-stone-400 leading-relaxed transition-colors font-light max-w-2xl">
          {t("description")}
        </p>
      </header>

      {/* 游戏入口列表 */}
      <div className="space-y-1">
        <GamesDashEntry />

        {/* 看图猜县 · 集章入口 */}
        <GamesStampEntry />

        {/* 慕斯的小屋入口 */}
        <GamesRoomEntry />
      </div>

      {/* 底部返回按钮 */}
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
