import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * ComponentPreview store：托管全局对所有 demo 卡片生效的两个开关。
 * - `hideCode`：隐藏底部代码面板（与单个 ComponentPreview 上的 `hideCode` prop 取或，全局开就全部隐）
 * - `isExpand`：强制展开代码面板（覆盖单卡的 `View Code` 折叠态与高度上限）
 */
export type ComponentPreviewState = {
  hideCode: boolean;
  isExpand: boolean;
  setHideCode: (value: boolean) => void;
  setIsExpand: (value: boolean) => void;
  toggleHideCode: () => void;
  toggleIsExpand: () => void;
};

export const useComponentPreviewStore = create<ComponentPreviewState>()(
  persist(
    (set, get) => ({
      hideCode: false,
      isExpand: false,
      setHideCode: value => set({ hideCode: value }),
      setIsExpand: value => set({ isExpand: value }),
      toggleHideCode: () => set({ hideCode: !get().hideCode }),
      toggleIsExpand: () => set({ isExpand: !get().isExpand }),
    }),
    { name: 'retikz-component-preview' },
  ),
);
