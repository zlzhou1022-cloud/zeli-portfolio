import Link from "next/link";
import { useTranslations } from "next-intl";
import { TextReveal } from "@/components/text-reveal";

export default function Home() {
  // 引入翻译 Hook，锁定 "Home" 命名空间
  const t = useTranslations("Home");

  return (
    <div className="space-y-24">
      
      {/* 头部简介区块 - Editorial Style */}
      <TextReveal>
        <section className="mt-16 md:mt-32 max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-serif mb-8 text-stone-900 dark:text-stone-100 transition-colors leading-[1.1]">
            {t("greeting")}
          </h1>
          <div className="border-l border-stone-300 dark:border-stone-700 pl-6 md:pl-8 space-y-4">
            <h2 className="text-2xl md:text-3xl text-stone-700 dark:text-stone-300 font-light transition-colors">
              {t("title")}
            </h2>
            <p className="text-base md:text-lg text-stone-600 dark:text-stone-400 leading-relaxed max-w-2xl transition-colors font-light">
              {t("bio")}
            </p>
          </div>
        </section>
      </TextReveal>

      {/* 模块入口区块 - Masonry Asymmetric Layout */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        
        {/* Profile - 占据左侧大块 */}
        <TextReveal delay={100} className="md:col-span-7 md:row-span-2">
          <Link href="/profile" className="group relative overflow-hidden border border-stone-200 dark:border-stone-800 transition-all hover:border-stone-400 dark:hover:border-stone-600 cursor-pointer block bg-stone-50 dark:bg-stone-900 hover-lift h-full">
            <div className="p-8 md:p-12 h-full flex flex-col justify-between min-h-[320px]">
              <div>
                <div className="text-xs tracking-[0.2em] uppercase text-stone-400 dark:text-stone-500 mb-4 font-medium">01</div>
                <h3 className="text-3xl md:text-4xl font-serif mb-4 text-stone-900 dark:text-stone-100 transition-colors">{t("modules.profile.title")}</h3>
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed max-w-md transition-colors font-light">
                  {t("modules.profile.desc")}
                </p>
              </div>
              <div className="text-sm font-medium text-stone-900 dark:text-stone-100 flex items-center gap-2 transition-colors mt-8">
                <span className="group-hover:translate-x-1 transition-transform">→</span>
                {t("modules.profile.link")}
              </div>
            </div>
          </Link>
        </TextReveal>

        {/* Lab - 右上小块 */}
        <TextReveal delay={200} className="md:col-span-5">
          <Link href="/lab" className="group relative overflow-hidden border border-stone-200 dark:border-stone-800 transition-all hover:border-stone-400 dark:hover:border-stone-600 cursor-pointer block bg-white dark:bg-stone-950 hover-lift h-full">
            <div className="p-6 md:p-8 h-full flex flex-col justify-between min-h-[180px]">
              <div>
                <div className="text-xs tracking-[0.2em] uppercase text-stone-400 dark:text-stone-500 mb-3 font-medium">02</div>
                <h3 className="text-2xl font-serif mb-3 text-stone-900 dark:text-stone-100 transition-colors">{t("modules.lab.title")}</h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed transition-colors font-light">
                  {t("modules.lab.desc")}
                </p>
              </div>
              <div className="text-xs font-medium text-stone-900 dark:text-stone-100 flex items-center gap-2 transition-colors mt-4">
                <span className="group-hover:translate-x-1 transition-transform">→</span>
                {t("modules.lab.link")}
              </div>
            </div>
          </Link>
        </TextReveal>

        {/* Travels - 右下中块 */}
        <TextReveal delay={300} className="md:col-span-5">
          <Link href="/travels" className="group relative overflow-hidden border border-stone-200 dark:border-stone-800 transition-all hover:border-stone-400 dark:hover:border-stone-600 cursor-pointer block bg-white dark:bg-stone-950 hover-lift h-full">
            <div className="p-6 md:p-8 h-full flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="text-xs tracking-[0.2em] uppercase text-stone-400 dark:text-stone-500 mb-3 font-medium">03</div>
                <h3 className="text-2xl font-serif mb-3 text-stone-900 dark:text-stone-100 transition-colors">{t("modules.travel.title")}</h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed transition-colors font-light">
                  {t("modules.travel.desc")}
                </p>
              </div>
              <div className="text-xs font-medium text-stone-900 dark:text-stone-100 flex items-center gap-2 transition-colors mt-4">
                <span className="group-hover:translate-x-1 transition-transform">→</span>
                {t("modules.travel.link")}
              </div>
            </div>
          </Link>
        </TextReveal>

        {/* Guestbook - 底部横条 */}
        <TextReveal delay={400} className="md:col-span-7">
          <Link href="/guestbook" className="group relative overflow-hidden border border-stone-200 dark:border-stone-800 transition-all hover:border-stone-400 dark:hover:border-stone-600 cursor-pointer block bg-stone-50 dark:bg-stone-900 hover-lift h-full">
            <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="text-xs tracking-[0.2em] uppercase text-stone-400 dark:text-stone-500 font-medium">04</div>
                <div>
                  <h3 className="text-xl font-serif mb-1 text-stone-900 dark:text-stone-100 transition-colors">{t("modules.guestbook.title")}</h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 transition-colors font-light">
                    {t("modules.guestbook.desc")}
                  </p>
                </div>
              </div>
              <div className="text-xs font-medium text-stone-900 dark:text-stone-100 flex items-center gap-2 transition-colors">
                <span className="group-hover:translate-x-1 transition-transform">→</span>
                {t("modules.guestbook.link")}
              </div>
            </div>
          </Link>
        </TextReveal>

      </section>
    </div>
  );
}