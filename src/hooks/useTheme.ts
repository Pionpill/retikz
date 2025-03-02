import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeType = 'dark' | 'light';

type ThemeStore = {
  theme: ThemeType;
  switchTheme: (newTheme?: ThemeType | 'system') => void;
}

const getSysColor = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: getSysColor(),
      switchTheme: (newTheme) =>
        set((state) => ({
          theme: newTheme === 'system' ? getSysColor() : newTheme || (state.theme === 'light' ? 'dark' : 'light'),
        })),
    }),
    {
      name: 'theme',
    }
  )
);

export default useThemeStore;

/**
 * 主题选择器，根据主题色返回对应内容
 * @param light 浅色主题内容
 * @param dark 深色主题内容
 * @returns 当前主题下的内容
 */
export const useThemeSelector = <T>(light: T, dark: T) => {
  return useThemeStore((state) => state.theme) === 'light' ? light : dark;
};