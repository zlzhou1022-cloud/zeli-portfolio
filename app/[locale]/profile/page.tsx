import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function ProfilePage() {
  const t = useTranslations("ProfilePage");

  return (
    <div className="max-w-5xl mx-auto space-y-16 animate-in fade-in duration-1000 mt-8 mb-32">
      
      {/* 顶部返回按钮 */}
      <div>
        <Link href="/" className="inline-flex items-center gap-2 text-xs tracking-wider uppercase font-medium text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors group">
          <svg className="w-3 h-3 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t("backHome")}
        </Link>
      </div>

      {/* 头部：基本信息与联系方式 */}
      <section className="border-b border-stone-200 dark:border-stone-800 pb-16">
        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-4">
            <div className="relative w-full aspect-[3/4] overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-200 dark:bg-stone-800">
              <Image src="https://xvwjtmycuaplxmtgwkok.supabase.co/storage/v1/object/public/avatar/avatar.jpg" alt="Zeli Zhou" fill className="object-cover transition-all duration-500" priority />
            </div>
          </div>
          
          <div className="md:col-span-8 flex flex-col justify-center space-y-8">
            <div>
              <h1 className="text-5xl md:text-6xl font-serif mb-4 text-stone-900 dark:text-stone-100 transition-colors leading-[1.1]">Zeli Zhou</h1>
              <p className="text-xl text-stone-600 dark:text-stone-400 font-light transition-colors mb-6">{t("role")}</p>
              
              <div className="flex flex-col gap-3 text-sm text-stone-600 dark:text-stone-400 transition-colors font-light">
                <div className="flex items-center gap-3">
                  <span className="w-16 text-xs tracking-wider uppercase text-stone-400">Location</span>
                  <span>{t("location")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-16 text-xs tracking-wider uppercase text-stone-400">Email</span>
                  <a href="mailto:zlzhou1022@gmail.com" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors border-b border-stone-300 dark:border-stone-700 hover:border-stone-900 dark:hover:border-stone-100">
                    zlzhou1022@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-16 text-xs tracking-wider uppercase text-stone-400">LinkedIn</span>
                  <a href="https://www.linkedin.com/in/澤立-周-758a9a227" target="_blank" rel="noopener noreferrer" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors border-b border-stone-300 dark:border-stone-700 hover:border-stone-900 dark:hover:border-stone-100">
                    View Profile →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 职业经历区块 */}
      <section className="space-y-8">
        <h2 className="text-xs tracking-[0.2em] uppercase text-stone-400 dark:text-stone-500 font-medium">{t("experience")}</h2>
        <div className="border-l border-stone-200 dark:border-stone-800 pl-8 space-y-6">
          <div className="relative">
            <div className="absolute -left-[33px] top-2 w-2 h-2 bg-stone-900 dark:bg-stone-100 rounded-full"></div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-3 gap-2">
              <div>
                <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 transition-colors mb-1">{t("deloitte.name")}</h3>
                <p className="text-stone-600 dark:text-stone-400 font-light transition-colors">{t("deloitte.title")}</p>
              </div>
              <span className="text-xs tracking-wider text-stone-500 dark:text-stone-400 transition-colors">{t("deloitte.date")}</span>
            </div>
            <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed transition-colors font-light max-w-2xl">
              {t("deloitte.desc")}
            </p>
          </div>
        </div>
      </section>

      {/* 学生经历区块 */}
      <section className="space-y-8">
        <h2 className="text-xs tracking-[0.2em] uppercase text-stone-400 dark:text-stone-500 font-medium">{t("education")}</h2>
        <div className="border-l border-stone-200 dark:border-stone-800 pl-8 space-y-10">
          {/* 东大 */}
          <div className="relative">
            <div className="absolute -left-[33px] top-2 w-2 h-2 bg-stone-900 dark:bg-stone-100 rounded-full"></div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-3 gap-2">
              <div>
                <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 transition-colors mb-1">{t("utokyo.name")}</h3>
                <p className="text-stone-600 dark:text-stone-400 font-light transition-colors">{t("utokyo.degree")}</p>
              </div>
              <span className="text-xs tracking-wider text-stone-500 dark:text-stone-400 transition-colors">{t("utokyo.date")}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-900">
              <p className="text-xs tracking-wider uppercase text-stone-400 dark:text-stone-500 mb-2">{t("utokyothesis")}</p>
              <p className="text-sm text-stone-700 dark:text-stone-300 transition-colors font-light italic">{t("utokyo.thesis_title")}</p>
            </div>
          </div>

          {/* 武大 */}
          <div className="relative">
            <div className="absolute -left-[33px] top-2 w-2 h-2 bg-stone-900 dark:bg-stone-100 rounded-full"></div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-3 gap-2">
              <div>
                <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 transition-colors mb-1">{t("whu.name")}</h3>
                <p className="text-stone-600 dark:text-stone-400 font-light transition-colors">{t("whu.degree")}</p>
              </div>
              <span className="text-xs tracking-wider text-stone-500 dark:text-stone-400 transition-colors">{t("whu.date")}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-900">
              <p className="text-xs tracking-wider uppercase text-stone-400 dark:text-stone-500 mb-2">{t("whuthesis")}</p>
              <p className="text-sm text-stone-700 dark:text-stone-300 transition-colors font-light italic">{t("whu.thesis_title")}</p>
            </div>
          </div>
        </div>
      </section>

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