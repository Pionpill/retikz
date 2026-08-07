import type { ResolvedTheme } from '@retikz/core';

import type { ChartRecipeStyleContext } from '../families/shared';
import type { IRChartShared } from '../schemas';
import type { ResolvedChartThemeContext } from './resolved';

import { getChartThemePreset } from './catalog';
import { ChartThemeToken, ChartThemeTokenSource } from './constants';
import { ChartResolvedThemeTokensSchema, ChartThemeTokenOverridesSchema } from './schema';

/** 解析 effective Theme、Chart preset、稀疏 token 与稳定来源 */
export const resolveChartStyle = (
  effectiveTheme: Pick<ResolvedTheme, 'style' | 'mode'> & Partial<Pick<ResolvedTheme, 'tokens'>>,
  spec: Pick<IRChartShared, 'chartThemeTokens'>,
): ResolvedChartThemeContext => {
  const preset = getChartThemePreset(effectiveTheme.style, effectiveTheme.mode);
  const inherited = ChartThemeTokenOverridesSchema.parse(effectiveTheme.tokens?.chart ?? {});
  const overrides = ChartThemeTokenOverridesSchema.parse(spec.chartThemeTokens ?? {});
  const tokens = ChartResolvedThemeTokensSchema.parse({
    ...preset,
    ...structuredClone(inherited),
    ...structuredClone(overrides),
  });
  const tokenSources = Object.values(ChartThemeToken).map(token => {
    const local = Object.hasOwn(overrides, token);
    const inheritedToken = Object.hasOwn(inherited, token);
    return {
      token,
      kind: local
        ? ChartThemeTokenSource.Local
        : inheritedToken
          ? ChartThemeTokenSource.Inherited
          : ChartThemeTokenSource.Preset,
      path: local
        ? `$spec/chartThemeTokens/${token}`
        : inheritedToken
          ? `$theme/tokens/chart/${token}`
          : `$preset/${effectiveTheme.style}/${effectiveTheme.mode}/${token}`,
    };
  });
  return { style: effectiveTheme.style, mode: effectiveTheme.mode, tokens, tokenSources };
};

/** 从 Chart token 与 Plot palette 收窄出 recipe 允许读取的表现默认值 */
export const chartRecipeStyleContextOf = (
  context: ResolvedChartThemeContext,
  seriesColor: string,
): ChartRecipeStyleContext => ({
  axisEnabled: context.tokens[ChartThemeToken.ChartAxisEnabled],
  axisGridEnabled: context.tokens[ChartThemeToken.ChartAxisGridEnabled],
  legendEnabled: context.tokens[ChartThemeToken.ChartLegendEnabled],
  seriesColor,
});
