import { useMemo } from 'react';

import { useComponentPreviewStore } from '@/modules/docs/store';
import { useThemeStore } from '@/store';

import type { PreviewThemeMode, PreviewThemeStyleSelection } from '../types';
import type { PreviewTheme } from './constants';

import { resolvePreviewTheme } from './constants';

/** 从持久化 docs 偏好生成稳定的 preview Theme */
export const usePreviewTheme = (
  themeStyleSelection?: PreviewThemeStyleSelection,
  themeModeOverride?: PreviewThemeMode,
): PreviewTheme => {
  const globalThemeStyle = useComponentPreviewStore(state => state.themeStyle);
  const globalThemeMode = useThemeStore(state => state.theme);
  const themeStyle =
    themeStyleSelection === undefined || themeStyleSelection === 'inherit' ? globalThemeStyle : themeStyleSelection;
  const themeMode =
    themeModeOverride === undefined || themeModeOverride === 'inherit' ? globalThemeMode : themeModeOverride;

  return useMemo(() => resolvePreviewTheme(themeStyle, themeMode), [themeMode, themeStyle]);
};
