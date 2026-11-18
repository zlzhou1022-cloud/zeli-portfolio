import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { TextReveal } from "@/components/text-reveal";
import { HomeTravel, type HomePhoto } from "@/components/home-travel";
import { HomeInvite } from "@/components/home-invite";
import HomeFooter from "@/components/home-footer";
import { getAllTrips } from "@/lib/travel-data";

export default function Home() {
  // 引入翻译 Hook，锁定 "Home" 命名空间
  const t = useTranslations("Home");
  const locale = useLocale() as "cn" | "jp" | "en";

  // 旅行露出：最新一趟旅程里挑东北三县的 4 张（与看图猜县同一批照片数据）
  const trip = getAllTrips()[0];
  const pick = (file: string, pref: string, titleKey: string, page: number): HomePhoto | null => {
    const ph = trip.photos.find((p) => p.src.endsWith(file));
    if (!ph) return null;
    return {
      src: ph.src,
      pref,
      titleKey,
      place: ph.place[locale] ?? ph.place.cn,
      date: trip.date.slice(0, 7).replace("-", "."),
      page,
      tripId: trip.id,
    };
  };
  const photos = [
    pick("tazawako.jpg", "akita", "tazawako", 5),
    pick("kamakurasaiyoru.jpg", "akita", "kamakura", 9),
    pick("nebuta.jpg", "aomori", "nebuta", 3),
    pick("moriokahachiman.jpg", "iwate", "hachiman", 10),
  ].filter((p): p is HomePhoto => p !== null);

  return (
    <div>
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

          {/* 近况条（2026-11-18 新增）：一行活状态，传递「此人还在活动」 */}
          <div className="mt-8 max-w-[860px] border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-5 py-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-stone-700 dark:text-stone-300">
              <span className="now-dot" aria-hidden />
              <span className="font-semibold text-stone-900 dark:text-stone-100">{t("now.label")}</span>
              <span>{t("now.location")}</span>
              <span className="text-stone-300 dark:text-stone-700">|</span>
              <span>{t("now.focus")}</span>
              <span className="text-stone-300 dark:text-stone-700">|</span>
              <span>{t("now.learning")}</span>
            </div>
            <div className="mt-1.5 text-xs text-stone-400 dark:text-stone-500">
              {t("now.updatedLabel")}：
              <span className="text-amber-700 dark:text-amber-400 font-medium">{t("now.updatedText")}</span>
              {" · "}
              {t("now.pageUpdated")}
            </div>
          </div>
        </section>
      </TextReveal>

      {/* 模块入口区块 - Masonry Asymmetric Layout（旅行卡已升级为下方整屏旅行区） */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 mt-16 md:mt-24">
        {/* Profile - 左侧大块，带一行低调资历小字 */}
        <TextReveal delay={100} className="md:col-span-7">
          <Link href="/profile" className="group relative overflow-hidden border border-stone-200 dark:border-stone-800 transition-all hover:border-stone-400 dark:hover:border-stone-600 cursor-pointer block bg-stone-50 dark:bg-stone-900 hover-lift h-full">
            <div className="p-8 md:p-12 h-full flex flex-col justify-between min-h-[280px]">
              <div>
                <div className="text-xs tracking-[0.2em] uppercase text-stone-400 dark:text-stone-500 mb-4 font-medium">01</div>
                <h3 className="text-3xl md:text-4xl font-serif mb-4 text-stone-900 dark:text-stone-100 transition-colors">{t("modules.profile.title")}</h3>
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed max-w-md transition-colors font-light">
                  {t("modules.profile.desc")}
                </p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-4 tracking-wide">{t("modules.profile.meta")}</p>
              </div>
              <div className="text-sm font-medium text-stone-900 dark:text-stone-100 flex items-center gap-2 transition-colors mt-8">
                <span className="group-hover:translate-x-1 transition-transform">→</span>
                {t("modules.profile.link")}
              </div>
            </div>
          </Link>
        </TextReveal>

        {/* Lab - 右上小块，带维护状态点 */}
        <TextReveal delay={200} className="md:col-span-5">
          <Link href="/lab" className="group relative overflow-hidden border border-stone-200 dark:border-stone-800 transition-all hover:border-stone-400 dark:hover:border-stone-600 cursor-pointer block bg-white dark:bg-stone-950 hover-lift h-full">
            <div className="p-6 md:p-8 h-full flex flex-col justify-between min-h-[180px]">
              <div>
                <div className="text-xs tracking-[0.2em] uppercase text-stone-400 dark:text-stone-500 mb-3 font-medium flex items-center justify-between">
                  <span>02</span>
                  <span className="flex items-center gap-1.5 tracking-normal normal-case text-lime-700 dark:text-lime-500 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-lime-600 dark:bg-lime-500 inline-block" />
                    {t("modules.lab.status")}
                  </span>
                </div>
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
      </section>

      {/* 旅行区（光影与足迹）——站长 2026-11-19 定序：档案 01、实验室 02 之后，留言 04、小游戏 05 之前 */}
      <div className="mt-6">
        <TextReveal delay={150}>
          <HomeTravel photos={photos} />
        </TextReveal>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 mt-6">
        {/* Guestbook - 旅行之后 */}
        <TextReveal delay={300} className="md:col-span-5">
          <Link href="/guestbook" className="group relative overflow-hidden border border-stone-200 dark:border-stone-800 transition-all hover:border-stone-400 dark:hover:border-stone-600 cursor-pointer block bg-white dark:bg-stone-950 hover-lift h-full">
            <div className="p-6 md:p-8 h-full flex flex-col justify-between min-h-[180px]">
              <div>
                <div className="text-xs tracking-[0.2em] uppercase text-stone-400 dark:text-stone-500 mb-3 font-medium">04</div>
                <h3 className="text-2xl font-serif mb-3 text-stone-900 dark:text-stone-100 transition-colors">{t("modules.guestbook.title")}</h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed transition-colors font-light">
                  {t("modules.guestbook.desc")}
                </p>
              </div>
              <div className="text-xs font-medium text-stone-900 dark:text-stone-100 flex items-center gap-2 transition-colors mt-4">
                <span className="group-hover:translate-x-1 transition-transform">→</span>
                {t("modules.guestbook.link")}
              </div>
            </div>
          </Link>
        </TextReveal>

        {/* Games - 右下宽块 */}
        <TextReveal delay={400} className="md:col-span-7">
          <Link href="/games" className="group relative overflow-hidden border border-stone-200 dark:border-stone-800 transition-all hover:border-stone-400 dark:hover:border-stone-600 cursor-pointer block bg-stone-50 dark:bg-stone-900 hover-lift h-full">
            <div className="p-6 md:p-8 h-full flex flex-col justify-between min-h-[180px]">
              <div>
                <div className="text-xs tracking-[0.2em] uppercase text-stone-400 dark:text-stone-500 mb-3 font-medium">05</div>
                <h3 className="text-2xl font-serif mb-3 text-stone-900 dark:text-stone-100 transition-colors">{t("modules.games.title")}</h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed transition-colors font-light max-w-md">
                  {t("modules.games.desc")}
                </p>
              </div>
              <div className="text-xs font-medium text-stone-900 dark:text-stone-100 flex items-center gap-2 transition-colors mt-4">
                <span className="group-hover:translate-x-1 transition-transform">→</span>
                {t("modules.games.link")}
              </div>
            </div>
          </Link>
        </TextReveal>
      </section>

      {/* 慕斯邀请条（2026-11-18 新增；2026-11-19 随定序移到全部入口之后收尾） */}
      <div className="mt-6">
        <HomeInvite />
      </div>

      <div className="mt-14">
        <HomeFooter />
      </div>
    </div>
  );
}
