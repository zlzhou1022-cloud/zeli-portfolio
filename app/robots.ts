import type { MetadataRoute } from "next";

// 爬虫规则（2026-11-18）：公开页面放行；API 禁止抓取。
// 注意：后台路径不写进这里——Disallow 等于公开广播路径存在；后台改由页面级 noindex 防索引。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api"],
      },
    ],
    sitemap: "https://zeli-portfolio.vercel.app/sitemap.xml",
  };
}
