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

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zeli | 个人主页",
  description: "软件工程师履历、技术博客与生活记录",
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

  return (
    <html lang={locale} suppressHydrationWarning>
      {/* 建议给 body 也加上 suppressHydrationWarning，防止因为插件注入导致的类名不匹配警告 */}
      <body className={`${inter.className} antialiased min-h-screen flex flex-col`} suppressHydrationWarning>
        
        {/* 1. 把 ThemeProvider 放在最外层，并补齐暗黑模式的属性 */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          
          {/* 2. 把多语言 Provider 放在里面 */}
          <NextIntlClientProvider messages={messages}>
            
            {/* 顶部导航栏 */}
            <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-md sticky top-0 z-50 transition-colors">
              <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="text-xl font-bold tracking-tight hover:opacity-70 transition-opacity text-slate-900 dark:text-slate-100">
                  Zeli.
                </Link>
                
                <div className="flex items-center gap-3">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
              </div>
            </header>

            {/* 主内容区 */}
            <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
              {children}
            </main>

          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}