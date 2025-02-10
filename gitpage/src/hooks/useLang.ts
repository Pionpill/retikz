'use client';
import { LocaleTypes } from '@/config';
import { useParams, usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';

const useLang = () => {
  const lng = useParams<{ lng: LocaleTypes }>().lng;
  const router = useRouter();
  const pathname = usePathname();
  return {
    lng,
    switchLang: (newLang?: LocaleTypes, replace = true) => {
      const newPaths = pathname.split('/');
      newPaths[1] = newLang || lng === 'en' ? 'zh' : 'en';
      (replace ? router.replace : router.push)(newPaths.join('/'));
    },
  };
};

export default useLang;
