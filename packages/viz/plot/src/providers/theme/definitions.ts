import type { BuiltinThemeStyleValue, ResolvedTheme } from '@retikz/core';

import { ThemeStyle } from '@retikz/core';

import type { ResolvedPlotThemeStyle } from '../../contract';

import { definePlotThemeStyle } from '../../contract';
import { getPlotThemePreset } from './catalog';
import { getAxisTokenRules } from './preset';

const resolveBuiltinPlotThemeStyle = (style: BuiltinThemeStyleValue, theme: ResolvedTheme): ResolvedPlotThemeStyle => ({
  tokens: getPlotThemePreset(style, theme.mode, theme.colors.categorical),
  tokenRules: getAxisTokenRules(),
});

/** 所有 Plot 内置 Theme style definitions */
export const BUILTIN_PLOT_THEME_STYLES = Object.values(ThemeStyle).map(style =>
  definePlotThemeStyle({ name: style, resolve: theme => resolveBuiltinPlotThemeStyle(style, theme) }),
);
