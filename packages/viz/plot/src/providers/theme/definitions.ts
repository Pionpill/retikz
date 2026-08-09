import type { BuiltinThemeStyleValue, ResolvedTheme } from '@retikz/core';

import { ThemeStyle } from '@retikz/core';

import type { IRPlotResolvedThemeTokens } from '../../schemas';

import { definePlotThemeStyle } from '../../contract';
import { getPlotThemePreset } from './catalog';

const resolveBuiltinPlotThemeStyle = (style: BuiltinThemeStyleValue, theme: ResolvedTheme): IRPlotResolvedThemeTokens =>
  getPlotThemePreset(style, theme.mode);

/** 所有 Plot 内置 Theme style definitions */
export const BUILTIN_PLOT_THEME_STYLES = (Object.values(ThemeStyle) as Array<BuiltinThemeStyleValue>).map(style =>
  definePlotThemeStyle({ name: style, resolve: theme => resolveBuiltinPlotThemeStyle(style, theme) }),
);
