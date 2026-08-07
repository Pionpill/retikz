import type { ResolvedTheme } from '@retikz/core';

import type { ChartRecipeStyleContext } from '../families/shared';
import type { IRChartShared } from '../schemas';
import type { ResolvedChartStyleContext } from './resolved';

import { getChartStylePreset } from './catalog';
import { ChartStyleToken, ChartStyleTokenSource } from './constants';
import { ChartResolvedStyleTokensSchema, ChartStyleTokenOverridesSchema } from './schema';

/** 解析 effective Theme、Chart preset、稀疏 token 与稳定来源 */
export const resolveChartStyle = (
  effectiveTheme: Pick<ResolvedTheme, 'style' | 'mode'>,
  spec: Pick<IRChartShared, 'chartThemeTokens'>,
): ResolvedChartStyleContext => {
  const preset = getChartStylePreset(effectiveTheme.style, effectiveTheme.mode);
  const overrides = ChartStyleTokenOverridesSchema.parse(spec.chartThemeTokens ?? {});
  const tokens = ChartResolvedStyleTokensSchema.parse({ ...preset, ...structuredClone(overrides) });
  const tokenSources = Object.values(ChartStyleToken).map(token => {
    const overridden = Object.hasOwn(overrides, token);
    return {
      token,
      kind: overridden ? ChartStyleTokenSource.StyleToken : ChartStyleTokenSource.Preset,
      path: overridden
        ? `$spec/chartThemeTokens/${token}`
        : `$preset/${effectiveTheme.style}/${effectiveTheme.mode}/${token}`,
    };
  });
  return { style: effectiveTheme.style, mode: effectiveTheme.mode, tokens, tokenSources };
};

/** 从 Chart token 与 Plot palette 收窄出 recipe 允许读取的表现默认值 */
export const chartRecipeStyleContextOf = (
  context: ResolvedChartStyleContext,
  seriesColor: string,
): ChartRecipeStyleContext => ({
  axisEnabled: context.tokens[ChartStyleToken.ChartAxisEnabled],
  axisGridEnabled: context.tokens[ChartStyleToken.ChartAxisGridEnabled],
  legendEnabled: context.tokens[ChartStyleToken.ChartLegendEnabled],
  seriesColor,
});
