import { getTripById } from "@/lib/travel-data";
import { TravelPagination } from "@/components/travel-pagination";
import { ImageViewer } from "@/components/image-viewer"; 
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
// 💡 1. 引入我们刚写好的平滑滚动组件
import { ScrollLink } from "@/components/scroll-link";

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
    <div className="max-w-6xl mx-auto animate-in fade-in duration-1000 mt-8 pb-32">
      <div className="mb-8 px-4 lg:px-0">
        <Link href="/travels" className="inline-flex items-center gap-2 text-xs tracking-wider uppercase font-medium text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors group">
          <svg className="w-3 h-3 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t("back")}
        </Link>
      </div>

      {/* 💡 手机端默认堆叠，电脑端分为左右两列 */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 px-4 lg:px-0">
        
        <aside className="w-full lg:w-80 shrink-0">
          <div className="lg:sticky lg:top-24 border-b lg:border-b-0 lg:border-r border-stone-200 dark:border-stone-800 pb-8 lg:pb-0 lg:pr-8">
            
            <div className="mb-6">
              <h2 className="text-3xl font-serif text-stone-900 dark:text-stone-100 mb-2">{tTrips(`${id}.title`)}</h2>
              <p className="text-xs tracking-wider uppercase text-stone-500 dark:text-stone-400">
                {trip.date} • {totalPage} {t("photos")}
              </p>
            </div>
            
            {/* 💡 核心魔术区：手机端 flex-row 横滑，电脑端 flex-col 纵滑 */}
            <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-y-auto gap-3 lg:gap-2 pb-2 lg:pb-0 snap-x snap-mandatory lg:max-h-[60vh] [&::-webkit-scrollbar]:hidden">
              {trip.photos.map((_, index) => {
                const pageNum = index + 1;
                const isActive = pageNum === currentPage;
                return (
                  <ScrollLink 
                    key={pageNum} 
                    href={`/travels/${id}?p=${pageNum}`} 
                    className={`snap-start shrink-0 w-56 lg:w-full block py-3 px-4 lg:px-3 lg:py-2 text-sm transition-all border-l-2 lg:border-l-2 ${
                      isActive 
                        ? "border-stone-900 dark:border-stone-100 bg-stone-50 dark:bg-stone-900/50 text-stone-900 dark:text-stone-100 font-medium" 
                        : "border-transparent text-stone-500 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-700 hover:text-stone-900 dark:hover:text-stone-100 font-light"
                    }`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] tracking-wider uppercase opacity-60">{String(pageNum).padStart(2, '0')}</span>
                      <span className="line-clamp-2">{tTrips(`${id}.photos.${pageNum}`)}</span>
                    </div>
                  </ScrollLink>
                );
              })}
            </div>
          </div>
        </aside>

        {/* 💡 3. 加入 id="photo-viewer" 和 scroll-mt-24 防遮挡 */}
        <main id="photo-viewer" className="flex-1 w-full min-w-0 flex flex-col scroll-mt-24">
          <section className="space-y-8">
            <ImageViewer src={currentPhoto.src} alt={tTrips(`${id}.photos.${currentPage}`)} />
            <div className="px-4 lg:px-0">
              <div className="border-l-2 border-stone-200 dark:border-stone-800 pl-6 mb-6">
                <p className="text-xl font-light text-stone-800 dark:text-stone-200 leading-relaxed">
                  {tTrips(`${id}.photos.${currentPage}`)}
                </p>
              </div>
              <p className="text-xs tracking-wider uppercase text-stone-400">
                {id.toUpperCase()} / {t("page")} {currentPage}
              </p>
            </div>
          </section>
          
          <div className="mt-12">
            <TravelPagination tripId={id} currentPage={currentPage} totalPage={totalPage} />
          </div>
        </main>
        
      </div>
    </div>
  );
}