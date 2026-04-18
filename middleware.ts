import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: [
    '/',
    '/(cn|jp|en)/:path*',
    // 💡 核心修复：在 ?! 后面加上 admin| ，让中间件放过所有 /admin 开头的路由
    '/((?!_next|_vercel|admin|.*\\..*).*)'
  ]
};