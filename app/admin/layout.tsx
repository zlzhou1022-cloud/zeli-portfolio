import "@/app/globals.css";
import { ThemeProvider } from "next-themes";
import { CustomCursor } from "@/components/custom-cursor";
import { ScrollProgress } from "@/components/scroll-progress";
import { AnimatedBackground } from "@/components/animated-background";
import type { Viewport } from 'next';

export const metadata = {
  title: "管理后台 | Zeli's Space",
  description: "纯中文极简管理后台",
  // 后台不进搜索引擎（2026-11-18）：用 noindex 而非 robots.txt Disallow，避免广播路径
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 💡 suppressHydrationWarning 是 next-themes 要求的，防止暗黑模式闪烁
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased bg-slate-50 dark:bg-slate-950 transition-colors" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AnimatedBackground />
          <CustomCursor />
          <ScrollProgress />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}