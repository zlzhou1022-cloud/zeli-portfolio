import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';

export const routing = defineRouting({
  // 支持的语言列表
  locales: ['cn', 'jp', 'en'],
  // 默认语言
  defaultLocale: 'cn',
  // 自动检测浏览器语言
  localeDetection: true
});

// 导出用于导航的钩子，这会替换 Next.js 原生的 Link 和 useRouter
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);