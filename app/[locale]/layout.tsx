import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css"; 
import { ThemeProvider } from "@/components/providers";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";

import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {routing} from '@/i18n/routing';
import {notFound} from 'next/navigation';

// 💡 1. 引入 Redis 和 聊天机器人组件
import { Redis } from "@upstash/redis";
import { ChatBot } from "@/components/chat-bot";
import { CustomCursor } from "@/components/custom-cursor";
import { ScrollProgress } from "@/components/scroll-progress";
import { AnimatedBackground } from "@/components/animated-background";
import type { Viewport } from 'next';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zeli | 个人主页",
  description: "软件工程师履历、技术博客与生活记录",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  if (!routing.locales.includes(locale as typeof routing.locales[number])) {
    notFound();
  }

  const messages = await getMessages();

  // 💡 2. 在服务端检查今日全局配额（新建 session 数超过 50）
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  const today = new Date().toISOString().split('T')[0];
  const globalQuota = await redis.get<number>(`chat_new_sessions:${today}`) ?? 0;
  const isQuotaFull = globalQuota >= 50;

  return (
    <html lang={locale} suppressHydrationWarning>
      {/* 建议给 body 也加上 suppressHydrationWarning，防止因为插件注入导致的类名不匹配警告 */}
      <body className={`${inter.className} antialiased min-h-screen flex flex-col`} suppressHydrationWarning>
        
        {/* 1. 把 ThemeProvider 放在最外层，并补齐暗黑模式的属性 */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          
          {/* 2. 把多语言 Provider 放在里面 */}
          <NextIntlClientProvider messages={messages}>
            
            {/* 动态背景 */}
            <AnimatedBackground />
            
            {/* 自定义光标 */}
            <CustomCursor />
            
            {/* 滚动进度条 */}
            <ScrollProgress />
            
            {/* 顶部导航栏 */}
            <header className="border-b border-stone-200 dark:border-stone-800 bg-white/90 dark:bg-stone-950/90 backdrop-blur-md sticky top-0 z-50 transition-colors">
              <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="text-xl font-serif tracking-tight hover:opacity-70 transition-opacity text-stone-900 dark:text-stone-100">
                  Zeli
                </Link>
                
                <div className="flex items-center gap-2">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
              </div>
            </header>

            {/* 主内容区 */}
            <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
              {children}
            </main>

            {/* 💡 3. 将聊天机器人挂载到全局，放在 Providers 内部以支持暗黑模式等 */}
            <ChatBot isQuotaFull={isQuotaFull} />

          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}