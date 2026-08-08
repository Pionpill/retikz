import type { ThemeStyleValue } from '@retikz/core';
import type { AnimationMode } from '@retikz/react';

import { ThemeStyle } from '@retikz/core';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type {
  PreviewColorSchemeValue,
  PreviewSharedColors,
} from '@/modules/docs/components/component-preview/theme/types';
import type { PreviewThemeMode } from '@/modules/docs/components/component-preview/types';

import { PreviewDefaultSharedColors } from '@/modules/docs/components/component-preview/theme/constants';
import { PreviewColorScheme } from '@/modules/docs/components/component-preview/theme/types';

/** ComponentPreview 全局开关 */
export type ComponentPreviewState = {
  hideCode: boolean;
  isExpand: boolean;
  dragEnabled: boolean;
  rendererMode: 'svg' | 'canvas';
  animationMode: AnimationMode;
  /** 新预览实例使用的局部主题默认值 */
  themeMode: PreviewThemeMode;
  /** 所有 ComponentPreview 的 Core ThemeStyle */
  themeStyle: ThemeStyleValue;
  /** 所有 ComponentPreview 的 categorical 颜色系列 */
  colorScheme: PreviewColorSchemeValue;
  /** 所有 ComponentPreview 的 Core shared semantic colors */
  sharedColors: PreviewSharedColors;
  /** 新预览实例是否默认打开属性面板 */
  controlPanelDefaultOpen: boolean;
  /** 未单独配置时，range 从最小值播放到最大值的默认时长（毫秒） */
  rangePlaybackDuration: number;
  setHideCode: (value: boolean) => void;
  setIsExpand: (value: boolean) => void;
  setDragEnabled: (value: boolean) => void;
  setRendererMode: (value: 'svg' | 'canvas') => void;
  setAnimationMode: (value: AnimationMode) => void;
  /** 设置新预览实例的局部主题默认值 */
  setThemeMode: (value: PreviewThemeMode) => void;
  /** 设置所有 ComponentPreview 的 Core ThemeStyle */
  setThemeStyle: (value: ThemeStyleValue) => void;
  /** 设置所有 ComponentPreview 的 categorical 颜色系列 */
  setColorScheme: (value: PreviewColorSchemeValue) => void;
  /** 设置所有 ComponentPreview 的一个 Core shared semantic color */
  setSharedColor: <TKey extends keyof PreviewSharedColors>(key: TKey, value: PreviewSharedColors[TKey]) => void;
  /** 设置新预览实例的属性面板默认状态 */
  setControlPanelDefaultOpen: (value: boolean) => void;
  /** 设置未单独配置时的 range 默认播放时长 */
  setRangePlaybackDuration: (value: number) => void;
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
      themeStyle: ThemeStyle.Neutral,
      colorScheme: PreviewColorScheme.Category10,
      sharedColors: PreviewDefaultSharedColors,
      controlPanelDefaultOpen: true,
      rangePlaybackDuration: 2000,
      setHideCode: value => set({ hideCode: value }),
      setIsExpand: value => set({ isExpand: value }),
      setDragEnabled: value => set({ dragEnabled: value }),
      setRendererMode: value => set({ rendererMode: value }),
      setAnimationMode: value => set({ animationMode: value }),
      setThemeMode: value => set({ themeMode: value }),
      setThemeStyle: value => set({ themeStyle: value }),
      setColorScheme: value => set({ colorScheme: value }),
      setSharedColor: (key, value) => set(state => ({ sharedColors: { ...state.sharedColors, [key]: value } })),
      setControlPanelDefaultOpen: value => set({ controlPanelDefaultOpen: value }),
      setRangePlaybackDuration: value => set({ rangePlaybackDuration: value }),
      toggleHideCode: () => set({ hideCode: !get().hideCode }),
      toggleIsExpand: () => set({ isExpand: !get().isExpand }),
      toggleDragEnabled: () => set({ dragEnabled: !get().dragEnabled }),
      toggleRendererMode: () => set({ rendererMode: get().rendererMode === 'svg' ? 'canvas' : 'svg' }),
      toggleControlPanelDefaultOpen: () => set({ controlPanelDefaultOpen: !get().controlPanelDefaultOpen }),
    }),
    { name: 'retikz-component-preview' },
  ),
);
