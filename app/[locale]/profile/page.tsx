import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function ProfilePage() {
  const t = useTranslations("ProfilePage");

  return (
    <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in duration-700 mt-8 mb-20">
      
      {/* 顶部返回按钮 */}
      <div>
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors group">
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t("backHome")}
        </Link>
      </div>

      {/* 头部：基本信息与联系方式 */}
      <section className="flex flex-col md:flex-row gap-8 items-center md:items-start">
        <div className="relative w-40 h-40 shrink-0 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center transition-colors">
          <Image src="https://xvwjtmycuaplxmtgwkok.supabase.co/storage/v1/object/public/avatar/avatar.jpg" alt="Zeli Zhou" fill className="object-cover" priority />
        </div>
        
        <div className="text-center md:text-left space-y-4 pt-2">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 transition-colors">Zeli Zhou</h1>
              <a href="https://www.linkedin.com/in/澤立-周-758a9a227" target="_blank" rel="noopener noreferrer" className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center shadow-sm" title="LinkedIn">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
              </a>
            </div>
            <p className="text-lg text-slate-700 dark:text-slate-300 font-medium transition-colors">{t("role")}</p>
            
            <div className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4 mt-3 text-sm text-slate-500 dark:text-slate-400 transition-colors">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <span>{t("location")}</span>
              </div>
              <div className="hidden md:block text-slate-300 dark:text-slate-700">•</div>
              <a href="mailto:zlzhou1022@gmail.com" className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                <span>zlzhou1022@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 职业经历区块 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 transition-colors">
          <span className="w-1.5 h-6 bg-blue-600 dark:bg-blue-500 rounded-full"></span>{t("experience")}
        </h2>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 transition-colors">{t("deloitte.name")}</h3>
              <p className="text-slate-700 dark:text-slate-300 font-medium transition-colors">{t("deloitte.title")}</p>
            </div>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg transition-colors">{t("deloitte.date")}</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed transition-colors">
            {t("deloitte.desc")}
          </p>
        </div>
      </section>

      {/* 学生经历区块 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 transition-colors">
          <span className="w-1.5 h-6 bg-emerald-600 dark:bg-emerald-500 rounded-full"></span>{t("education")}
        </h2>
        <div className="space-y-4">
          {/* 东大 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 transition-colors">{t("utokyo.name")}</h3>
                <p className="text-slate-700 dark:text-slate-300 font-medium transition-colors">{t("utokyo.degree")}</p>
              </div>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-lg transition-colors">{t("utokyo.date")}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/50 border-l-4 border-slate-200 dark:border-slate-700 p-3 transition-colors">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1 tracking-wider">{t("utokyothesis")}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 transition-colors">{t("utokyo.thesis_title")}</p>
            </div>
          </div>

          {/* 武大 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 transition-colors">{t("whu.name")}</h3>
                <p className="text-slate-700 dark:text-slate-300 font-medium transition-colors">{t("whu.degree")}</p>
              </div>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-lg transition-colors">{t("whu.date")}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/50 border-l-4 border-slate-200 dark:border-slate-700 p-3 transition-colors">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1 tracking-wider">{t("whuthesis")}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 transition-colors">{t("whu.thesis_title")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 底部返回按钮 */}
      <div className="pt-8 mt-12 border-t border-slate-200 dark:border-slate-800 flex justify-center">
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all hover:scale-105 active:scale-95 cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t("backHome")}
        </Link>
      </div>

    </div>
  );
}