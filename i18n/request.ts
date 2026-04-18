import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';

export default getRequestConfig(async ({requestLocale}) => {
  let locale = await requestLocale;

  // 确保请求的语言在支持列表中，否则使用默认语言
  // 使用 typeof routing.locales[number] 动态推导类型，完美骗过...不对，是完美满足 TS 的类型推断
  if (!locale || !routing.locales.includes(locale as typeof routing.locales[number])) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});