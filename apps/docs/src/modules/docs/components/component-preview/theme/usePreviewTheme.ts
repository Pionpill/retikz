import type { ThemeStyleValue } from '@retikz/core';

import { useMemo } from 'react';

import { useComponentPreviewStore } from '@/modules/docs/store';
import { useThemeStore } from '@/store';

import type { PreviewThemeMode } from '../types';
import type { PreviewTheme } from './constants';

import { resolvePreviewTheme } from './constants';

/** 从持久化 docs 偏好生成稳定的 preview Theme */
export const usePreviewTheme = (
  themeStyleOverride?: ThemeStyleValue,
  themeModeOverride?: PreviewThemeMode,
): PreviewTheme => {
  const globalThemeStyle = useComponentPreviewStore(state => state.themeStyle);
  const globalThemeMode = useThemeStore(state => state.theme);
  const themeStyle = themeStyleOverride ?? globalThemeStyle;
  const themeMode =
    themeModeOverride === undefined || themeModeOverride === 'inherit' ? globalThemeMode : themeModeOverride;

  return useMemo(() => resolvePreviewTheme(themeStyle, themeMode), [themeMode, themeStyle]);
};
