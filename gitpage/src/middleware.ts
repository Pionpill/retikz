import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import { NextRequest } from 'next/server';
import { defaultLocale, locales } from './config';
import { cookies } from 'next/headers';
import { LANG_COOKIE_NAME } from './config/cookie';

const getLocale = (request: NextRequest) => {
  const headers = { 'accept-language': request.headers.get('accept-language') || '' };
  const languages = new Negotiator({ headers }).languages();
  return match(languages, locales, defaultLocale);
};

const middleware = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/zh') || pathname.startsWith('/en')) return;

  // 判断 cookie 中是否有语言
  const cookieStore = await cookies();
  const defaultLang = cookieStore.get(LANG_COOKIE_NAME)?.value;
  if (defaultLang) {
    request.nextUrl.pathname = `/${defaultLang}${pathname}`;
    return Response.redirect(request.nextUrl);
  }

  // 判断请求路径中是否已存在语言，已存在语言则跳过
  const pathnameHasLocale = locales.some(locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`);

  if (pathnameHasLocale) return;
  // 不重定向静态资源
  if (/\.(.*)$/.test(pathname)) return;

  // 获取匹配的 locale
  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return Response.redirect(request.nextUrl);
};

export default middleware;

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
