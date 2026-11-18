import type { MetadataRoute } from "next";
import { getAllTrips } from "@/lib/travel-data";

// 站点地图（2026-11-18）：仅公开页面 × 三语，含语言替代链接；后台/API 不入图。
const BASE = "https://zeli-portfolio.vercel.app";
const LOCALES = ["cn", "jp", "en"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/profile",
    "/lab",
    "/guestbook",
    "/travels",
    ...getAllTrips().map((t) => `/travels/${t.id}`),
    "/games",
    "/games/room",
    "/games/garden",
    "/games/prefecture-game",
  ];
  const now = new Date();
  return paths.flatMap((path) =>
    LOCALES.map((locale) => ({
      url: `${BASE}/${locale}${path}`,
      lastModified: now,
      alternates: {
        languages: {
          "zh-CN": `${BASE}/cn${path}`,
          ja: `${BASE}/jp${path}`,
          en: `${BASE}/en${path}`,
        },
      },
    })),
  );
}
