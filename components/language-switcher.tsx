"use client";

import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  // 1. 将 label 修改为目标语言的母语名称
  const languages = [
    { code: "cn", label: "中文" },
    { code: "jp", label: "日本語" },
    { code: "en", label: "English" }
  ];

  // 找到当前选中的语言对象
  const currentLanguage = languages.find((lang) => lang.code === locale) || languages[0];

  const onSelectChange = (nextLocale: string) => {
    setIsOpen(false);
    
    const newPath = pathname === "/" ? `/${nextLocale}` : `/${nextLocale}${pathname}`;
    const currentSearchParams = searchParams.toString();
    const finalUrl = currentSearchParams ? `${newPath}?${currentSearchParams}` : newPath;

    window.location.replace(finalUrl);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors opacity-90 hover:opacity-100"
      >
        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        {/* 2. 直接渲染当前语言的母语标签，去掉多余的 "LAN :" */}
        {currentLanguage.label}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="py-1 flex flex-col">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => onSelectChange(lang.code)}
                  className={`px-4 py-2 text-sm text-center transition-colors ${
                    locale === lang.code
                      ? "font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}