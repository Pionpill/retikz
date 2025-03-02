import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LangType = 'zh' | 'en';

type LangStore = {
    lang: LangType;
    switchLang: (newLang: LangType | 'system') => void;
}

const getSysLang = () => navigator.language.startsWith('zh') ? 'zh' : 'en';

const useLang = create<LangStore>()(
  persist(
    (set) => ({
      lang: getSysLang(),
      switchLang: (newTheme) =>
        set((state) => ({
          lang: newTheme === 'system' ? getSysLang() : newTheme || (state.lang === 'zh' ? 'en' : 'zh'),
        })),
    }),
    {
      name: 'lang',
    }
  )
);

export default useLang;