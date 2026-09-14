import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 文档站布局形态 */
export type DocLayout = 'default' | 'centered';

/**
 * Layout store：托管文档站布局与左侧目录可见性
 * @description `default` 三栏拉开，`centered` 正文居中、两侧留白；左侧目录独立开关并持久化
 */
export type LayoutState = {
  layout: DocLayout;
  setLayout: (layout: DocLayout) => void;
  toggleLayout: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
};

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      layout: 'default',
      setLayout: layout => set({ layout }),
      toggleLayout: () => set({ layout: get().layout === 'default' ? 'centered' : 'default' }),
      sidebarOpen: true,
      setSidebarOpen: sidebarOpen => set({ sidebarOpen }),
      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
    }),
    { name: 'retikz-layout' },
  ),
);
