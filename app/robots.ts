import type { MetadataRoute } from "next";

// 爬虫规则（2026-11-18）：公开页面放行；后台与 API 禁止抓取，避免被搜索引擎索引。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: "https://zeli-portfolio.vercel.app/sitemap.xml",
  };
}
