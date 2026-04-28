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
    <div className="space-y-16 animate-in fade-in duration-1000 mb-32">
      <header className="border-b border-stone-200 dark:border-stone-800 pb-12">
        <Link href="/" className="inline-flex items-center gap-2 text-xs tracking-wider uppercase font-medium text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors group mb-8">
          <svg className="w-3 h-3 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t("backHome")}
        </Link>
        <h1 className="text-5xl md:text-6xl font-serif text-stone-900 dark:text-stone-100 mb-4 leading-[1.1]">{t("title")}</h1>
        <p className="text-stone-500 font-light">{t("subtitle")}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-16">
        {trips.map((trip, index) => (
          <Link key={trip.id} href={`/travels/${trip.id}?p=1`} className="group block space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden border border-stone-200 dark:border-stone-800 group-hover:border-stone-400 dark:group-hover:border-stone-600 transition-all">
              <Image src={trip.cover} alt={trip.title} fill className="object-cover transition-all duration-700" />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 mb-1">{tTrips(`${trip.id}.title`)}</h2>
                <p className="text-xs tracking-wider text-stone-500 uppercase">{trip.date}</p>
              </div>
              <div className="text-xs tracking-[0.2em] uppercase text-stone-400 dark:text-stone-500 font-medium pt-1">
                {String(index + 1).padStart(2, '0')}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}