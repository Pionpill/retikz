import type { ResolvedTheme } from '@retikz/core';

import { ThemeStyle } from '@retikz/core';

import { defineTableThemeStyle } from '../../contract';
import { getTableThemePreset } from './presets';

/** 所有 Table 内置 Theme style definitions */
export const BUILTIN_TABLE_THEME_STYLES = Object.values(ThemeStyle).map(style =>
  defineTableThemeStyle({ name: style, resolve: (theme: ResolvedTheme) => getTableThemePreset(style, theme.mode) }),
);
