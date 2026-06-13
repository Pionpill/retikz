import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 主题种类 */
export type Theme = 'light' | 'dark';

/** 主题 store 状态 */
export type ThemeState = {
  /** 当前主题 */
  theme: Theme;
  /** 切换主题；同时把 .dark class 同步到 <html> */
  setTheme: (theme: Theme) => void;
};

/** 把主题应用到 DOM 根节点（shadcn 暗色用 .dark class 区分） */
const applyToDOM = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
};

export const useThemeStore = create<ThemeState>()(
  persist(
    set => ({
      theme: 'light',
      setTheme: theme => {
        applyToDOM(theme);
        set({ theme });
      },
    }),
    {
      name: 'retikz-theme',
      onRehydrateStorage: () => state => {
        // 持久化恢复后，把还原的 theme 应用到 DOM
        if (state) applyToDOM(state.theme);
      },
    },
  ),
);
