import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// 告诉插件我们刚才写的 request.ts 在哪里
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
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