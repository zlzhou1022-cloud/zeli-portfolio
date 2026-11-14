"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

// 小游戏专区的「慕斯的小屋」入口卡片：跳到养成页 /games/room（站长 2026-11-15 一期）。
export function GamesRoomEntry() {
  const t = useTranslations("Room");
  const locale = useLocale();
  return (
    <Link
      href={`/${locale}/games/room`}
      className="group block w-full text-left border border-stone-200 dark:border-stone-800 py-8 px-6 -mx-6 hover:bg-amber-50 dark:hover:bg-stone-900/50 transition-all"
    >
      <div className="flex items-start justify-between gap-8 mb-2">
        <div className="flex items-baseline gap-4">
          <span className="text-xs tracking-[0.2em] uppercase text-amber-500 font-medium">⌂</span>
          <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            {t("entryTitle")}
          </h2>
        </div>
        <span className="text-xs tracking-wider uppercase font-medium text-stone-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors shrink-0 mt-2">
          {t("entryCta")} →
        </span>
      </div>
      <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed font-light ml-12">{t("entryDesc")}</p>
    </Link>
  );
}
