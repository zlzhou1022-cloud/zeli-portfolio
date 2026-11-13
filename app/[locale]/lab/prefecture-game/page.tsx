import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { PrefectureGame } from "@/components/prefecture-game";

export default function PrefectureGamePage() {
  const t = useTranslations("PrefectureGame");
  const locale = useLocale();

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-1000 mt-8 mb-32">
      <header className="border-b border-stone-200 dark:border-stone-800 pb-12 mb-12">
        <Link
          href={`/${locale}/lab`}
          className="inline-flex items-center gap-2 text-xs tracking-wider uppercase font-medium text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors group mb-8"
        >
          <svg className="w-3 h-3 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t("backLab")}
        </Link>
        <h1 className="text-4xl md:text-5xl font-serif text-stone-900 dark:text-stone-100 transition-colors mb-4 leading-[1.1]">
          {t("pageTitle")}
        </h1>
        <p className="text-stone-600 dark:text-stone-400 leading-relaxed transition-colors font-light max-w-2xl">
          {t("pageDesc")}
        </p>
      </header>

      <PrefectureGame />
    </div>
  );
}
