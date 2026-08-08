import type { IRScene, ResolvedThemeColors, ThemeStyleValue } from '@retikz/core';

import { resolveCoreThemeColors, ThemeMode, ThemeStyle } from '@retikz/core';
import {
  schemeAccent,
  schemeCategory10,
  schemeDark2,
  schemeObservable10,
  schemePaired,
  schemePastel1,
  schemePastel2,
  schemeSet1,
  schemeSet2,
  schemeSet3,
  schemeTableau10,
} from 'd3-scale-chromatic';

import type { PreviewColorSchemeValue } from './types';

import { PreviewColorScheme } from './types';

/** ComponentPreview 支持的 ThemeStyle 选项 */
export const PreviewThemeStyleOptions: ReadonlyArray<ThemeStyleValue> = [
  ThemeStyle.Neutral,
  ThemeStyle.Academic,
  ThemeStyle.Vibrant,
  ThemeStyle.Clean,
];

/** ComponentPreview 支持的颜色系列选项 */
export const PreviewColorSchemeOptions = [
  PreviewColorScheme.Category10,
  PreviewColorScheme.Accent,
  PreviewColorScheme.Dark2,
  PreviewColorScheme.Observable10,
  PreviewColorScheme.Paired,
  PreviewColorScheme.Pastel1,
  PreviewColorScheme.Pastel2,
  PreviewColorScheme.Set1,
  PreviewColorScheme.Set2,
  PreviewColorScheme.Set3,
  PreviewColorScheme.Tableau10,
] as const satisfies ReadonlyArray<PreviewColorSchemeValue>;

const toCategoricalColors = (colors: ReadonlyArray<string>): ResolvedThemeColors['categorical'] => {
  if (colors.length === 0) throw new Error('Preview categorical color schemes must not be empty.');
  return Object.freeze([...colors]) as ResolvedThemeColors['categorical'];
};

/** d3-scale-chromatic categorical schemes 映射到 Core palette.categorical 的颜色数组 */
export const PreviewColorSchemeColors: Readonly<Record<PreviewColorSchemeValue, ResolvedThemeColors['categorical']>> =
  Object.freeze({
    [PreviewColorScheme.Category10]: toCategoricalColors(schemeCategory10),
    [PreviewColorScheme.Accent]: toCategoricalColors(schemeAccent),
    [PreviewColorScheme.Dark2]: toCategoricalColors(schemeDark2),
    [PreviewColorScheme.Observable10]: toCategoricalColors(schemeObservable10),
    [PreviewColorScheme.Paired]: toCategoricalColors(schemePaired),
    [PreviewColorScheme.Pastel1]: toCategoricalColors(schemePastel1),
    [PreviewColorScheme.Pastel2]: toCategoricalColors(schemePastel2),
    [PreviewColorScheme.Set1]: toCategoricalColors(schemeSet1),
    [PreviewColorScheme.Set2]: toCategoricalColors(schemeSet2),
    [PreviewColorScheme.Set3]: toCategoricalColors(schemeSet3),
    [PreviewColorScheme.Tableau10]: toCategoricalColors(schemeTableau10),
  });

/** ComponentPreview 默认使用的中性亮色 shared semantic colors */
export const PreviewDefaultSharedColors: ResolvedThemeColors['semantic'] = resolveCoreThemeColors(
  ThemeStyle.Neutral,
  ThemeMode.Light,
).semantic;

/** 根据 docs 偏好生成传给 Core 的 sparse Theme selector */
export const resolvePreviewTheme = (themeStyle: ThemeStyleValue): IRScene['theme'] => ({ style: themeStyle });
