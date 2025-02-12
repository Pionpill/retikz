'use client';
import { LocaleTypes } from '@/config';
import { COOKIE_COMMON_MAX_AGE, LANG_COOKIE_NAME } from '@/config/cookie';
import { useParams, usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';

const useLang = () => {
  const lng = useParams<{ lng: LocaleTypes }>().lng;
  const router = useRouter();
  const pathname = usePathname();
  return {
    lng,
    switchLang: (lang?: LocaleTypes, replace = true) => {
      const newPaths = pathname.split('/');
      const newLang = lang || lng === 'en' ? 'zh' : 'en';
      newPaths[1] = newLang;
      document.cookie = `${LANG_COOKIE_NAME}=${newLang}; path=/; max-age=${COOKIE_COMMON_MAX_AGE}`;
      (replace ? router.replace : router.push)(newPaths.join('/'));
    },
  };
};

export default useLang;
