import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 文档站布局形态 */
export type DocLayout = 'default' | 'centered';

/**
 * Layout store：托管文档站三列 ↔ 居中布局
 * @description `default` 三栏拉开，`centered` 正文居中、两侧留白；tocOpen 状态保留，切回 default 自动恢复
 */
export type LayoutState = {
  layout: DocLayout;
  setLayout: (layout: DocLayout) => void;
  toggleLayout: () => void;
};

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      layout: 'default',
      setLayout: layout => set({ layout }),
      toggleLayout: () => set({ layout: get().layout === 'default' ? 'centered' : 'default' }),
    }),
    { name: 'retikz-layout' },
  ),
);
