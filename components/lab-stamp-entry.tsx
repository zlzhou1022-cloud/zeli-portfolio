"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

// Lab 页的「看图猜县 · 集章」入口卡片：跳到独立游戏页 /lab/prefecture-game
// （地图需要整页空间，不像慕斯向前冲那样用弹窗）。
export function LabStampEntry() {
  const t = useTranslations("PrefectureGame");
  const locale = useLocale();
  return (
    <Link
      href={`/${locale}/lab/prefecture-game`}
      className="group block w-full text-left border border-stone-200 dark:border-stone-800 py-8 px-6 -mx-6 hover:bg-sky-50 dark:hover:bg-stone-900/50 transition-all"
    >
      <div className="flex items-start justify-between gap-8 mb-2">
        <div className="flex items-baseline gap-4">
          <span className="text-xs tracking-[0.2em] uppercase text-sky-500 font-medium">🗾</span>
          <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 group-hover:text-sky-700 dark:group-hover:text-sky-300 transition-colors">
            {t("labCardTitle")}
          </h2>
        </div>
        <span className="text-xs tracking-wider uppercase font-medium text-stone-400 group-hover:text-sky-700 dark:group-hover:text-sky-300 transition-colors shrink-0 mt-2">
          {t("labCardCta")} →
        </span>
      </div>
      <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed font-light ml-12">{t("labCardDesc")}</p>
    </Link>
  );
}
