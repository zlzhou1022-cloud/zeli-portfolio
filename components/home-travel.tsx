"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import japan from "@svg-maps/japan";

export interface HomePhoto {
  src: string;
  pref: string;
  titleKey: string;
  place: string;
  date: string;
  page: number;
  tripId: string;
}

const GOLD = ["aomori", "akita", "iwate"];

// 首页「光影与足迹」露出区（2026-11-18）：真实县界地图 + 最新旅程照片。
// 地图入场时按从北到南逐县点亮；点金色三县（有照片的东北三县）高亮对应照片。
export function HomeTravel({ photos }: { photos: HomePhoto[] }) {
  const t = useTranslations("Home");
  const svgRef = useRef<SVGSVGElement>(null);
  const [lit, setLit] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<string | null>(null);

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
    if (GOLD.includes(id)) return "fill-[#d9a441]";
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
              const gold = GOLD.includes(location.id);
              return (
                <path
                  key={location.id}
                  id={location.id}
                  d={location.path}
                  onClick={gold ? () => setSel(location.id) : undefined}
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
            {sel ? t("travel.viewing", { name: t(`travel.prefNames.${sel}`) }) : t("travel.goldHint")}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          {photos.map((photo) => (
            <Link
              key={photo.src}
              href={`/travels/${photo.tripId}?p=${photo.page}`}
              className={`group border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 overflow-hidden transition-shadow ${
                sel === photo.pref ? "ring-2 ring-amber-500 shadow-lg" : ""
              }`}
            >
              <div className="relative h-32 md:h-44 overflow-hidden">
                <Image
                  src={photo.src}
                  alt={t(`travel.photos.${photo.titleKey}`)}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-3">
                <div className="text-sm font-medium text-stone-900 dark:text-stone-100 leading-snug">
                  {t(`travel.photos.${photo.titleKey}`)}
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
