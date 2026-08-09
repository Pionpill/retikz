import type { ResolvedTheme } from '@retikz/core';

import { ThemeTokenSource } from '@retikz/core';

import type { PlotThemeStyleDefinition } from '../../contract';
import type { IRPlotSpec, IRPlotThemeResolution, PlotThemeTokenValue } from '../../schemas';

import {
  PlotResolvedThemeTokensSchema,
  PlotThemeResolutionSchema,
  PlotThemeSchema,
  PlotThemeToken,
  PlotThemeTokenOverridesSchema,
} from '../../schemas';
import { applyPlotThemeToTokens, mergePlotTheme, plotThemeFromTokens } from './mapping';
import { resolvePlotThemeStyleRegistry } from './registry';

/** 按 Plot style、Core shared colors、Plot-local 输入与 native Plot theme 顺序解析主题 */
export const resolvePlotTheme = (
  effectiveTheme: ResolvedTheme,
  input: Pick<IRPlotSpec, 'plotThemeTokens' | 'colors' | 'plotTheme'> = {},
  plotThemeStyles: ReadonlyArray<PlotThemeStyleDefinition> | undefined = undefined,
): IRPlotThemeResolution => {
  const { style, mode } = effectiveTheme;
  const styles = resolvePlotThemeStyleRegistry(plotThemeStyles);
  const definition = styles.get(style);
  if (definition === undefined) throw new Error(`Plot theme style '${style}' is not registered.`);
  const plotThemeTokens = PlotThemeTokenOverridesSchema.parse(input.plotThemeTokens ?? {});
  const colors = input.colors === undefined ? undefined : structuredClone(input.colors);
  const authoredTheme = input.plotTheme === undefined ? undefined : PlotThemeSchema.parse(input.plotTheme);
  const baseline = definition.resolve(effectiveTheme);
  const categorical = [...effectiveTheme.colors.categorical];
  const tokensAfterShared = PlotResolvedThemeTokensSchema.parse({
    ...baseline,
    [PlotThemeToken.PlotPaletteCategorical]: categorical,
    [PlotThemeToken.PlotPaletteSeries]: [...categorical],
    [PlotThemeToken.PlotPaletteSector]: [...categorical],
  });
  const tokensAfterLocal = PlotResolvedThemeTokensSchema.parse({
    ...tokensAfterShared,
    ...structuredClone(plotThemeTokens),
  });
  const tokensAfterColors =
    colors === undefined
      ? tokensAfterLocal
      : PlotResolvedThemeTokensSchema.parse({
          ...tokensAfterLocal,
          [PlotThemeToken.PlotPaletteCategorical]: colors,
          [PlotThemeToken.PlotPaletteSeries]: [...colors],
          [PlotThemeToken.PlotPaletteSector]: [...colors],
        });
  const tokenTheme = plotThemeFromTokens(tokensAfterColors);
  const theme = authoredTheme === undefined ? tokenTheme : mergePlotTheme(tokenTheme, authoredTheme);
  const nativeResult =
    authoredTheme === undefined
      ? { tokens: tokensAfterColors, overrides: [] }
      : applyPlotThemeToTokens(tokensAfterColors, theme, authoredTheme);
  const tokens = PlotResolvedThemeTokensSchema.parse(nativeResult.tokens);
  const nativeSources = new Map(nativeResult.overrides.map(source => [source.token, source.path]));
  const colorTokens = new Set<PlotThemeTokenValue>([
    PlotThemeToken.PlotPaletteCategorical,
    PlotThemeToken.PlotPaletteSeries,
    PlotThemeToken.PlotPaletteSector,
  ]);
  const tokenSources = Object.values(PlotThemeToken).map(token => {
    const nativePath = nativeSources.get(token);
    if (nativePath !== undefined) {
      return { token, kind: ThemeTokenSource.Local, path: nativePath };
    }
    if (colors !== undefined && colorTokens.has(token)) {
      return { token, kind: ThemeTokenSource.Local, path: '$spec/colors' };
    }
    if (Object.hasOwn(plotThemeTokens, token)) {
      return { token, kind: ThemeTokenSource.Local, path: `$spec/plotThemeTokens/${token}` };
    }
    if (colorTokens.has(token)) {
      return { token, kind: ThemeTokenSource.Inherit, path: '$theme/colors/categorical' };
    }
    return {
      token,
      kind: ThemeTokenSource.Local,
      path: `$style/${style}/${mode}/${token}`,
    };
  });
  const palette = {
    categorical: [...tokens[PlotThemeToken.PlotPaletteCategorical]],
    series: [...tokens[PlotThemeToken.PlotPaletteSeries]],
    sector: [...tokens[PlotThemeToken.PlotPaletteSector]],
    sequential: tokens[PlotThemeToken.PlotPaletteSequential],
    diverging: tokens[PlotThemeToken.PlotPaletteDiverging],
  };
  const authoredOverrides: IRPlotThemeResolution['authoredOverrides'] = [
    ...(colors === undefined ? [] : [{ kind: ThemeTokenSource.Local, path: '$spec/colors' } as const]),
    ...(authoredTheme === undefined ? [] : [{ kind: ThemeTokenSource.Local, path: '$spec/plotTheme' } as const]),
  ];
  return PlotThemeResolutionSchema.parse({
    style,
    mode,
    tokens,
    tokenSources,
    authoredOverrides,
    plotTheme: theme,
    palette,
  });
};
