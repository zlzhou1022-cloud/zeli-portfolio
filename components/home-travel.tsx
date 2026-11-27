"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import japan from "@svg-maps/japan";

export interface HomePhoto {
  src: string;
  pref: string;
  place: string;
  date: string;
  page: number;
  tripId: string;
}

// 首页「光影与足迹」露出区（2026-11-18）：真实县界地图 + 旅程照片。
// 地图入场时按从北到南逐县点亮（47 县制霸）。金色 = 有照片的县（站长 2026-11-19
// 改定：不再绑定最近一趟旅程，凡相册里有照片的县都金色），由照片数据动态算。
// 展示规则（站长 2026-11-19 夜定，手机端优先）：点金色县 → 从该县照片里
// 随机抽 4 张（不足 4 张就全显示）。默认展示 2026-11-28 改定：不再固定最新
// 一趟的前 4 张，没选县时从全部照片里随机抽 4 张；再点一次选中的县或点
// 「回到随机照片」会重新随机一组（首屏渲染仍用最新旅程兜底，挂载后即换成随机）。
export function HomeTravel({ photos, latestTripId }: { photos: HomePhoto[]; latestTripId: string }) {
  const t = useTranslations("Home");
  const tt = useTranslations("Trips");
  const svgRef = useRef<SVGSVGElement>(null);
  const [lit, setLit] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<string | null>(null);
  const [picked, setPicked] = useState<HomePhoto[] | null>(null);
  const [randomSet, setRandomSet] = useState<HomePhoto[] | null>(null);
  const goldSet = new Set(photos.map((p) => p.pref));
  const pickRandom = (pool: HomePhoto[]) => [...pool].sort(() => Math.random() - 0.5).slice(0, 4);
  const shown = picked ?? randomSet ?? photos.filter((p) => p.tripId === latestTripId).slice(0, 4);
  const choose = (id: string) => {
    if (sel === id) {
      reset();
      return;
    }
    setSel(id);
    setPicked(pickRandom(photos.filter((p) => p.pref === id)));
  };
  const reset = () => {
    setSel(null);
    setPicked(null);
    setRandomSet(pickRandom(photos));
  };

  // 挂载后把默认展示换成全部照片的随机一组（随机只在客户端做，避免 SSR 不一致）
  useEffect(() => {
    const id = setTimeout(() => setRandomSet(pickRandom(photos)), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const paths = Array.from(svg.querySelectorAll("path"));
    const order = paths
      .map((p) => {
        const b = p.getBBox();
        return { id: p.id, cy: b.y + b.height / 2 };
      })
      .sort((a, b) => a.cy - b.cy)
      .map((x) => x.id);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setLit(new Set(order));
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    order.forEach((id, i) => {
      timers.push(
        setTimeout(() => {
          setLit((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
          });
        }, 200 + i * 26)
      );
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const fillFor = (id: string) => {
    if (!lit.has(id)) return "fill-stone-200 dark:fill-stone-800";
    if (goldSet.has(id)) return "fill-[#d9a441]";
    return "fill-[#b3c2a4] dark:fill-[#7d8c6f]";
  };

  return (
    <section className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-6 md:p-10">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6 md:mb-8">
        <div>
          <h3 className="text-2xl md:text-3xl font-serif text-stone-900 dark:text-stone-100">
            {t("modules.travel.title")}
          </h3>
          <p className="text-sm text-stone-600 dark:text-stone-400 font-light mt-2">
            {t("modules.travel.desc")}
          </p>
        </div>
        <Link
          href="/travels"
          className="text-sm font-medium text-stone-900 dark:text-stone-100 flex items-center gap-2 group"
        >
          <span className="group-hover:translate-x-1 transition-transform">→</span>
          {t("modules.travel.link")}
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        <div className="w-44 md:w-52 shrink-0 mx-auto md:mx-0 text-center">
          <svg ref={svgRef} viewBox={japan.viewBox} className="w-full h-auto" role="group" aria-label="Japan">
            {japan.locations.map((location: { id: string; name: string; path: string }) => {
              const gold = goldSet.has(location.id);
              return (
                <path
                  key={location.id}
                  id={location.id}
                  d={location.path}
                  onClick={gold ? () => choose(location.id) : undefined}
                  className={`home-map-path stroke-white dark:stroke-stone-900 ${fillFor(location.id)} ${
                    gold ? "cursor-pointer hover:fill-[#c08c1d]" : ""
                  } ${sel === location.id ? "stroke-amber-800 dark:stroke-amber-200" : ""}`}
                  style={{ strokeWidth: sel === location.id ? 1.6 : 0.7 }}
                >
                  <title>{location.name}</title>
                </path>
              );
            })}
          </svg>
          <div className="mt-3 text-sm text-stone-700 dark:text-stone-300">
            <span className="text-xl font-serif font-semibold text-amber-700 dark:text-amber-400">47 / 47</span>{" "}
            {t("travel.conquered")}
          </div>
          <div className="mt-1 text-xs text-stone-400 dark:text-stone-500">
            {sel ? (
              <>
                {t("travel.viewing", { name: t(`travel.prefNames.${sel}`) })}
                {" · "}
                <button type="button" onClick={reset} className="underline underline-offset-2 cursor-pointer hover:text-stone-600 dark:hover:text-stone-300">
                  {t("travel.showLatest")}
                </button>
              </>
            ) : (
              t("travel.goldHint")
            )}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          {shown.map((photo) => (
            <Link
              key={photo.src}
              href={`/travels/${photo.tripId}?p=${photo.page}`}
              className="group border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 overflow-hidden transition-shadow"
            >
              <div className="relative h-32 md:h-44 overflow-hidden">
                <Image
                  src={photo.src}
                  alt={tt(`${photo.tripId}.photos.${photo.page}`)}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-3">
                <div className="text-sm font-medium text-stone-900 dark:text-stone-100 leading-snug">
                  {tt(`${photo.tripId}.photos.${photo.page}`)}
                </div>
                <div className="text-[11px] text-stone-400 dark:text-stone-500 mt-1">
                  {photo.place} · {photo.date}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
