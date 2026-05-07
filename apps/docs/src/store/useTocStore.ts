import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** TOC store 状态：单纯托管右侧目录的开关 */
export type TocState = {
  /** TOC 是否展开 */
  tocOpen: boolean;
  /** 设置 TOC 展开 / 折叠 */
  setTocOpen: (open: boolean) => void;
};

export const useTocStore = create<TocState>()(
  persist(
    set => ({
      tocOpen: true,
      setTocOpen: open => set({ tocOpen: open }),
    }),
    { name: 'retikz-toc' },
  ),
);
