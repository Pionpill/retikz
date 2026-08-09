import { defineThemeStyle } from '../../contract';
import { ThemeStyle } from '../../shared';
import { resolveCoreThemeColors } from './colors';

/** 所有 Core 内置 Theme style definitions */
export const BUILTIN_THEME_STYLES = (Object.values(ThemeStyle)).map(style =>
  defineThemeStyle({ name: style, resolve: ({ mode }) => resolveCoreThemeColors(style, mode) }),
);
