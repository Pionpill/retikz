'use client';
import { COOKIE_COMMON_MAX_AGE, THEME_COOKIE_NAME } from '@/config/cookie';
import { create } from 'zustand';

export type ThemeType = {
  theme: 'dark' | 'light';
  switchTheme: (theme?: 'dark' | 'light') => void;
};

const useTheme = create<ThemeType>(set => ({
  theme: 'light',
  switchTheme: (theme?: 'dark' | 'light') => {
    set(state => {
      const newTheme = theme || (state.theme === 'dark' ? 'light' : 'dark');
      document.cookie = `${THEME_COOKIE_NAME}=${newTheme}; path=/; max-age=${COOKIE_COMMON_MAX_AGE}`;
      return { theme: newTheme };
    });
  },
}));

export default useTheme;

/**
 * 主题选择器，根据主题色返回对应内容
 * @param light 浅色主题内容
 * @param dark 深色主题内容
 * @returns 当前主题下的内容
 */
export const useThemeSelector = <T>(light: T, dark: T) => {
  return useTheme(state => state.theme) === 'light' ? light : dark;
};
