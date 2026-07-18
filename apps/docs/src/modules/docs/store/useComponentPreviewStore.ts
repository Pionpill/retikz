import type { AnimationMode } from '@retikz/react';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { PreviewThemeMode } from '@/modules/docs/components/component-preview';

/** ComponentPreview 全局开关。 */
export type ComponentPreviewState = {
  hideCode: boolean;
  isExpand: boolean;
  dragEnabled: boolean;
  rendererMode: 'svg' | 'canvas';
  animationMode: AnimationMode;
  /** 新预览实例使用的局部主题默认值 */
  themeMode: PreviewThemeMode;
  /** 新预览实例是否默认打开属性面板 */
  controlPanelDefaultOpen: boolean;
  setHideCode: (value: boolean) => void;
  setIsExpand: (value: boolean) => void;
  setDragEnabled: (value: boolean) => void;
  setRendererMode: (value: 'svg' | 'canvas') => void;
  setAnimationMode: (value: AnimationMode) => void;
  /** 设置新预览实例的局部主题默认值 */
  setThemeMode: (value: PreviewThemeMode) => void;
  /** 设置新预览实例的属性面板默认状态 */
  setControlPanelDefaultOpen: (value: boolean) => void;
  toggleHideCode: () => void;
  toggleIsExpand: () => void;
  toggleDragEnabled: () => void;
  toggleRendererMode: () => void;
  /** 切换新预览实例的属性面板默认状态 */
  toggleControlPanelDefaultOpen: () => void;
};

export const useComponentPreviewStore = create<ComponentPreviewState>()(
  persist(
    (set, get) => ({
      hideCode: false,
      isExpand: false,
      dragEnabled: false,
      rendererMode: 'svg',
      animationMode: 'system',
      themeMode: 'inherit',
      controlPanelDefaultOpen: true,
      setHideCode: value => set({ hideCode: value }),
      setIsExpand: value => set({ isExpand: value }),
      setDragEnabled: value => set({ dragEnabled: value }),
      setRendererMode: value => set({ rendererMode: value }),
      setAnimationMode: value => set({ animationMode: value }),
      setThemeMode: value => set({ themeMode: value }),
      setControlPanelDefaultOpen: value => set({ controlPanelDefaultOpen: value }),
      toggleHideCode: () => set({ hideCode: !get().hideCode }),
      toggleIsExpand: () => set({ isExpand: !get().isExpand }),
      toggleDragEnabled: () => set({ dragEnabled: !get().dragEnabled }),
      toggleRendererMode: () => set({ rendererMode: get().rendererMode === 'svg' ? 'canvas' : 'svg' }),
      toggleControlPanelDefaultOpen: () => set({ controlPanelDefaultOpen: !get().controlPanelDefaultOpen }),
    }),
    { name: 'retikz-component-preview' },
  ),
);
