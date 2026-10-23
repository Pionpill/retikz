import { useMemo } from 'react';

import { useComponentPreviewStore } from '@/modules/docs/store';
import { useThemeStore } from '@/store';

import type { PreviewThemeMode, PreviewThemeSelection } from '../types';
import type { PreviewTheme } from './constants';
import { resolvePreviewTheme } from './constants';

/** 从持久化 docs 偏好生成稳定的 preview Theme */
export const usePreviewTheme = (
  themeNameSelection?: PreviewThemeSelection,
  themeModeOverride?: PreviewThemeMode,
): PreviewTheme => {
  const globalTheme = useComponentPreviewStore(state => state.themeName);
  const globalThemeMode = useThemeStore(state => state.theme);
  const themeName =
    themeNameSelection === undefined || themeNameSelection === 'inherit' ? globalTheme : themeNameSelection;
  const themeMode =
    themeModeOverride === undefined || themeModeOverride === 'inherit' ? globalThemeMode : themeModeOverride;

  return useMemo(() => resolvePreviewTheme(themeName, themeMode), [themeMode, themeName]);
};
