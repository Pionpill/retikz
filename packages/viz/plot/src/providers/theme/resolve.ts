import type { ResolvedTheme } from '@retikz/core';

import type { IRPlotSpec, IRPlotThemeResolution, PlotStyleTokenValue } from '../../schemas';

import {
  PlotResolvedStyleTokensSchema,
  PlotStyleToken,
  PlotStyleTokenOverridesSchema,
  PlotStyleTokenSource,
  PlotThemeResolutionSchema,
  PlotThemeSchema,
} from '../../schemas';
import { getPlotStylePreset } from './catalog';
import { applyPlotThemeToTokens, mergePlotTheme, plotThemeFromTokens } from './mapping';

/** 按 effective Theme、Plot token、colors 与 native theme 顺序解析 Plot 主题 */
export const resolvePlotTheme = (
  effectiveTheme: ResolvedTheme,
  input: Pick<IRPlotSpec, 'styleTokens' | 'colors' | 'theme'> = {},
): IRPlotThemeResolution => {
  const styleTokens = PlotStyleTokenOverridesSchema.parse(input.styleTokens ?? {});
  const colors = input.colors === undefined ? undefined : structuredClone(input.colors);
  const authoredTheme = input.theme === undefined ? undefined : PlotThemeSchema.parse(input.theme);
  const preset = getPlotStylePreset(effectiveTheme.style, effectiveTheme.mode);
  const tokensAfterStyle = PlotResolvedStyleTokensSchema.parse({ ...preset, ...structuredClone(styleTokens) });
  const tokensAfterColors =
    colors === undefined
      ? tokensAfterStyle
      : PlotResolvedStyleTokensSchema.parse({
          ...tokensAfterStyle,
          [PlotStyleToken.PlotPaletteCategorical]: colors,
          [PlotStyleToken.PlotPaletteSeries]: colors,
          [PlotStyleToken.PlotPaletteSector]: colors,
        });
  const tokenTheme = plotThemeFromTokens(tokensAfterColors);
  const theme = authoredTheme === undefined ? tokenTheme : mergePlotTheme(tokenTheme, authoredTheme);
  const nativeResult =
    authoredTheme === undefined
      ? { tokens: tokensAfterColors, overrides: [] }
      : applyPlotThemeToTokens(tokensAfterColors, theme, authoredTheme);
  const tokens = PlotResolvedStyleTokensSchema.parse(nativeResult.tokens);
  const nativeSources = new Map(nativeResult.overrides.map(source => [source.token, source.path]));
  const colorTokens = new Set<PlotStyleTokenValue>([
    PlotStyleToken.PlotPaletteCategorical,
    PlotStyleToken.PlotPaletteSeries,
    PlotStyleToken.PlotPaletteSector,
  ]);
  const tokenSources = Object.values(PlotStyleToken).map(token => {
    const nativePath = nativeSources.get(token);
    if (nativePath !== undefined) {
      return { token, kind: PlotStyleTokenSource.Theme, path: nativePath };
    }
    if (colors !== undefined && colorTokens.has(token)) {
      return { token, kind: PlotStyleTokenSource.Colors, path: '$spec/colors' };
    }
    if (Object.hasOwn(styleTokens, token)) {
      return { token, kind: PlotStyleTokenSource.StyleToken, path: `$spec/styleTokens/${token}` };
    }
    return {
      token,
      kind: PlotStyleTokenSource.Preset,
      path: `$preset/${effectiveTheme.style}/${effectiveTheme.mode}/${token}`,
    };
  });
  const palette = {
    categorical: [...tokens[PlotStyleToken.PlotPaletteCategorical]],
    series: [...tokens[PlotStyleToken.PlotPaletteSeries]],
    sector: [...tokens[PlotStyleToken.PlotPaletteSector]],
    sequential: tokens[PlotStyleToken.PlotPaletteSequential],
    diverging: tokens[PlotStyleToken.PlotPaletteDiverging],
  };
  const authoredOverrides: IRPlotThemeResolution['authoredOverrides'] = [
    ...(colors === undefined ? [] : [{ kind: PlotStyleTokenSource.Colors, path: '$spec/colors' } as const]),
    ...(authoredTheme === undefined ? [] : [{ kind: PlotStyleTokenSource.Theme, path: '$spec/theme' } as const]),
  ];
  return PlotThemeResolutionSchema.parse({
    style: effectiveTheme.style,
    mode: effectiveTheme.mode,
    tokens,
    tokenSources,
    authoredOverrides,
    theme,
    palette,
  });
};
