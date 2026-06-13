import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { LANGS, type Lang } from '@/i18n';
import { useThemeStore } from '@/store/use-theme-store';

/** 顶栏 / 抽屉共享的动作集合：主题、语言、复制链接。 */
export const useDocActions = () => {
  const { t, i18n } = useTranslation();
  const theme = useThemeStore(s => s.theme);
  const setTheme = useThemeStore(s => s.setTheme);

  const handleCopyLink = useCallback(() => {
    void navigator.clipboard.writeText(window.location.href);
    toast.success(t('toc.linkCopied'));
  }, [t]);

  const handleToggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  const handleCycleLang = useCallback(() => {
    const idx = LANGS.indexOf(i18n.resolvedLanguage as Lang);
    const next = LANGS[(idx + 1) % LANGS.length];
    void i18n.changeLanguage(next);
  }, [i18n]);

  return {
    theme,
    handleToggleTheme,
    currentLang: i18n.resolvedLanguage,
    handleCycleLang,
    handleCopyLink,
  };
};

/** 资源链接常量（外链） */
export const TIKZ_DOCS_URL = 'https://tikz.dev/';
export const GITHUB_URL = 'https://github.com/Pionpill/retikz';
export const AUTHOR_GITHUB_URL = 'https://github.com/Pionpill';
