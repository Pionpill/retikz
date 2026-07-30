import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ThemeValue } from './theme-model';

import { applyThemeToRoot, defaultTheme } from './theme-model';

/** Bench 主题状态 */
export type ThemeState = Readonly<{
  theme: ThemeValue;
  setTheme: (theme: ThemeValue) => void;
}>;

/** 把主题同步到浏览器根节点 */
const applyToDocument = (theme: ThemeValue): void => {
  if (typeof document === 'undefined') return;
  applyThemeToRoot(theme, document.documentElement);
};

/** 持久化 Bench 主题并同步 shadcn 根节点 class */
export const useThemeStore = create<ThemeState>()(
  persist(
    set => ({
      theme: defaultTheme,
      setTheme: theme => {
        applyToDocument(theme);
        set({ theme });
      },
    }),
    {
      name: 'retikz-bench-theme',
      onRehydrateStorage: () => state => {
        if (state !== undefined) applyToDocument(state.theme);
      },
    },
  ),
);
