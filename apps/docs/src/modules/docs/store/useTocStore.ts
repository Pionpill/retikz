import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** TOC store 状态：托管右侧目录的开关与「当前页是否有目录内容」 */
export type TocState = {
  /** TOC 是否展开 */
  tocOpen: boolean;
  /** 设置 TOC 展开 / 折叠 */
  setTocOpen: (open: boolean) => void;
  /** 当前页是否有 TOC 内容（无内容时右栏不渲染 / 不占位，开关隐藏）；不持久化 */
  hasToc: boolean;
  /** 设置当前页是否有 TOC 内容 */
  setHasToc: (has: boolean) => void;
};

export const useTocStore = create<TocState>()(
  persist(
    set => ({
      tocOpen: true,
      setTocOpen: open => set({ tocOpen: open }),
      hasToc: false,
      setHasToc: has => set({ hasToc: has }),
    }),
    { name: 'retikz-toc', partialize: state => ({ tocOpen: state.tocOpen }) },
  ),
);
