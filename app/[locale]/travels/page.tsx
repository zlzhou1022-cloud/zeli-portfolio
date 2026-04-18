import Link from "next/link";
import Image from "next/image";
import { getAllTrips } from "@/lib/travel-data";
import { useTranslations } from "next-intl";

export default function TravelsPage() {
  const trips = getAllTrips();
  
  // 引入页面静态翻译和游记数据翻译
  const t = useTranslations("TravelsPage");
  const tTrips = useTranslations("Trips");

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header>
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors group mb-4">
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t("backHome")}
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{t("title")}</h1>
        <p className="text-slate-500 mt-2">{t("subtitle")}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {trips.map((trip) => (
          <Link key={trip.id} href={`/travels/${trip.id}?p=1`} className="group block space-y-4">
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm group-hover:shadow-xl transition-all">
              <Image src={trip.cover} alt={trip.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                <span className="text-white font-medium">{t("viewDetails")} →</span>
              </div>
            </div>
            <div>
              {/* 核心魔法：使用 id 动态获取该游记在对应语言下的标题 */}
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{tTrips(`${trip.id}.title`)}</h2>
              <p className="text-sm text-slate-500 mt-1">{trip.date}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}