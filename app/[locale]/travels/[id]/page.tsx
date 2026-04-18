import { getTripById } from "@/lib/travel-data";
import { TravelPagination } from "@/components/travel-pagination";
import { ImageViewer } from "@/components/image-viewer"; 
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

export default async function TripDetailPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string, locale: string }>,
  searchParams: Promise<{ p?: string }> 
}) {
  const { id } = await params;
  const { p } = await searchParams;
  
  const trip = getTripById(id);
  if (!trip) notFound();

  const t = await getTranslations("TripDetail");
  const tTrips = await getTranslations("Trips");

  const currentPage = parseInt(p || "1");
  const totalPage = trip.photos.length;
  const currentPhoto = trip.photos[currentPage - 1];

  if (!currentPhoto) notFound();

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-700 mt-8 pb-20">
      <div className="mb-6 px-2 lg:px-0">
        <Link href="/travels" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors group">
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t("back")}
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        <aside className="w-full lg:w-80 shrink-0">
          <div className="sticky top-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm max-h-[70vh] flex flex-col transition-colors">
            <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{tTrips(`${id}.title`)}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-mono tracking-wider">
                {trip.date} • {totalPage} {t("photos")}
              </p>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-1">
              {trip.photos.map((_, index) => {
                const pageNum = index + 1;
                const isActive = pageNum === currentPage;
                return (
                  <Link key={pageNum} href={`/travels/${id}?p=${pageNum}`} className={`block px-3 py-2.5 rounded-lg text-sm transition-all ${isActive ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"}`}>
                    <div className="flex gap-2">
                      <span className="shrink-0 font-mono">P{pageNum}:</span>
                      {/* 动态读取翻译 */}
                      <span className="line-clamp-2">{tTrips(`${id}.photos.${pageNum}`)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="flex-1 w-full min-w-0 flex flex-col">
          <section className="space-y-6">
            <ImageViewer src={currentPhoto.src} alt={tTrips(`${id}.photos.${currentPage}`)} />
            <div className="text-center px-4">
              <div className="h-14 flex items-center justify-center mb-2">
                <p className="text-lg font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                  {tTrips(`${id}.photos.${currentPage}`)}
                </p>
              </div>
              <p className="text-sm font-mono text-slate-400">
                {id.toUpperCase()} / {t("page")} {currentPage}
              </p>
            </div>
          </section>
          <div className="mt-10">
            <TravelPagination tripId={id} currentPage={currentPage} totalPage={totalPage} />
          </div>
        </main>
      </div>
    </div>
  );
}