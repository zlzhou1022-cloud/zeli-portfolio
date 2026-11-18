import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// 告诉插件我们刚才写的 request.ts 在哪里
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // 安全响应头（2026-11-18 审计后补）：防点击劫持/嗅探，收紧引用与设备权限。
  // CSP 只设 frame-ancestors，避免误伤站内脚本；HSTS 由 Vercel 平台默认下发。
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  // 之前配好的 Supabase 图片白名单保持不变
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "xvwjtmycuaplxmtgwkok.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**", 
      },
    ],
  },
};

// 关键步骤：用 withNextIntl 把配置包装起来再导出
export default withNextIntl(nextConfig);