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
        className="flex items-center gap-2 px-3 py-1.5 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-xs tracking-wider uppercase font-medium text-stone-600 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-600 transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        {currentLanguage.label}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-28 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="py-1 flex flex-col">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => onSelectChange(lang.code)}
                  className={`px-4 py-2.5 text-xs tracking-wider uppercase font-medium text-center transition-colors ${
                    locale === lang.code
                      ? "text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-900"
                      : "text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-900/50"
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