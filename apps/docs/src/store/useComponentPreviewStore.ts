import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * ComponentPreview store：托管全局对所有 demo 卡片生效的开关
 * @description `hideCode` 隐藏底部代码面板（与单卡 prop 取或）；`isExpand` 强制展开代码面板（覆盖单卡 View Code 折叠态与高度上限）；
 *   `dragEnabled` 全局把卡内 pan/zoom 拖拽默认为开（单卡 Hand 按钮的本地覆盖优先），方便移动端在更多菜单里一次切换所有 demo
 */
export type ComponentPreviewState = {
  hideCode: boolean;
  isExpand: boolean;
  dragEnabled: boolean;
  setHideCode: (value: boolean) => void;
  setIsExpand: (value: boolean) => void;
  setDragEnabled: (value: boolean) => void;
  toggleHideCode: () => void;
  toggleIsExpand: () => void;
  toggleDragEnabled: () => void;
};

export const useComponentPreviewStore = create<ComponentPreviewState>()(
  persist(
    (set, get) => ({
      hideCode: false,
      isExpand: false,
      dragEnabled: false,
      setHideCode: value => set({ hideCode: value }),
      setIsExpand: value => set({ isExpand: value }),
      setDragEnabled: value => set({ dragEnabled: value }),
      toggleHideCode: () => set({ hideCode: !get().hideCode }),
      toggleIsExpand: () => set({ isExpand: !get().isExpand }),
      toggleDragEnabled: () => set({ dragEnabled: !get().dragEnabled }),
    }),
    { name: 'retikz-component-preview' },
  ),
);
