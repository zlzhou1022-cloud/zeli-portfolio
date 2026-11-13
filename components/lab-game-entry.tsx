"use client";

import { useTranslations } from "next-intl";

// Lab 页的小游戏入口卡片：点击派发 ling:open-game 事件，由全局挂载的
// LingGame 组件打开游戏弹窗（与吉祥物气泡里的入口共用同一事件）。
export function LabGameEntry() {
  const t = useTranslations("MiniGame");
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("ling:open-game"))}
      className="group block w-full text-left border border-stone-200 dark:border-stone-800 py-8 px-6 -mx-6 hover:bg-amber-50 dark:hover:bg-stone-900/50 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-8 mb-2">
        <div className="flex items-baseline gap-4">
          <span className="text-xs tracking-[0.2em] uppercase text-amber-500 font-medium">✦</span>
          <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            {t("labCardTitle")}
          </h2>
        </div>
        <span className="text-xs tracking-wider uppercase font-medium text-stone-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors shrink-0 mt-2">
          {t("labCardCta")} →
        </span>
      </div>
      <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed font-light ml-12">
        {t("labCardDesc")}
      </p>
    </button>
  );
}
