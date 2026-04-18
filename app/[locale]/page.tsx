import Link from "next/link";
import { useTranslations } from "next-intl";

export default function Home() {
  // 引入翻译 Hook，锁定 "Home" 命名空间
  const t = useTranslations("Home");

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 头部简介区块 */}
      <section className="mt-10 md:mt-20">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-slate-900 dark:text-slate-100 transition-colors">
          {t("greeting")}
        </h1>
        <h2 className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 font-medium mb-6 transition-colors">
          {t("title")}
        </h2>
        <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl transition-colors">
          {t("bio")}
        </p>
      </section>

      {/* 模块入口区块 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-200 dark:border-slate-800 transition-colors">
        
        {/* 第一行左侧：个人主页 */}
        <Link href="/profile" className="group p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer block">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            👤
          </div>
          <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-slate-100 transition-colors">{t("modules.profile.title")}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 transition-colors">
            {t("modules.profile.desc")}
          </p>
          <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 transition-colors">
            {t("modules.profile.link")} <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>

        {/* 第一行右侧：实验室与插件 */}
        <Link href="/lab" className="group p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer block">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            💻
          </div>
          <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-slate-100 transition-colors">{t("modules.lab.title")}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 transition-colors">
            {t("modules.lab.desc")}
          </p>
          <div className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1 transition-colors">
            {t("modules.lab.link")} <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>

        {/* 第二行左侧：光影与足迹 */}
        <Link href="/travels" className="group p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer block">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            📸
          </div>
          <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-slate-100 transition-colors">{t("modules.travel.title")}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 transition-colors">
            {t("modules.travel.desc")}
          </p>
          <div className="text-sm font-medium text-orange-600 dark:text-orange-400 flex items-center gap-1 transition-colors">
            {t("modules.travel.link")} <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>

        {/* 第二行右侧：留言板 */}
        <Link href="/guestbook" className="group p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer block">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            💬
          </div>
          <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-slate-100 transition-colors">{t("modules.guestbook.title")}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 transition-colors">
            {t("modules.guestbook.desc")}
          </p>
          <div className="text-sm font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1 transition-colors">
            {t("modules.guestbook.link")} <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>

      </section>
    </div>
  );
}