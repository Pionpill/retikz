import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** ComponentPreview 全局开关。 */
export type ComponentPreviewState = {
  hideCode: boolean;
  isExpand: boolean;
  dragEnabled: boolean;
  rendererMode: 'svg' | 'canvas';
  setHideCode: (value: boolean) => void;
  setIsExpand: (value: boolean) => void;
  setDragEnabled: (value: boolean) => void;
  setRendererMode: (value: 'svg' | 'canvas') => void;
  toggleHideCode: () => void;
  toggleIsExpand: () => void;
  toggleDragEnabled: () => void;
  toggleRendererMode: () => void;
};

export const useComponentPreviewStore = create<ComponentPreviewState>()(
  persist(
    (set, get) => ({
      hideCode: false,
      isExpand: false,
      dragEnabled: false,
      rendererMode: 'svg',
      setHideCode: value => set({ hideCode: value }),
      setIsExpand: value => set({ isExpand: value }),
      setDragEnabled: value => set({ dragEnabled: value }),
      setRendererMode: value => set({ rendererMode: value }),
      toggleHideCode: () => set({ hideCode: !get().hideCode }),
      toggleIsExpand: () => set({ isExpand: !get().isExpand }),
      toggleDragEnabled: () => set({ dragEnabled: !get().dragEnabled }),
      toggleRendererMode: () => set({ rendererMode: get().rendererMode === 'svg' ? 'canvas' : 'svg' }),
    }),
    { name: 'retikz-component-preview' },
  ),
);
