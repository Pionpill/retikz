import type { ResolvedTheme } from '@retikz/core';

import { ThemeTokenSource } from '@retikz/core';

import type { ChartRecipeStyleContext } from '../families/shared';
import type { IRChartShared } from '../schemas';
import type { ChartThemeStyleDefinition } from './definition';
import type { ResolvedChartThemeContext } from './resolved';

import { ChartThemeToken } from './constants';
import { getDefaultChartThemePreset } from './catalog';
import { resolveChartThemeStyleRegistry } from './registry';
import { ChartResolvedThemeTokensSchema, ChartThemeTokenOverridesSchema } from './schema';

/** 解析 effective Theme、Chart style baseline、稀疏 token 与稳定来源 */
export const resolveChartStyle = (
  effectiveTheme: ResolvedTheme,
  spec: Pick<IRChartShared, 'chartThemeTokens'>,
  chartThemeStyles: ReadonlyArray<ChartThemeStyleDefinition> | undefined = undefined,
): ResolvedChartThemeContext => {
  const style = effectiveTheme.style;
  const styles = resolveChartThemeStyleRegistry(chartThemeStyles);
  const definition = style === undefined ? undefined : styles.get(style);
  if (style !== undefined && definition === undefined)
    throw new Error(`Chart theme style '${style}' is not registered.`);
  const baseline =
    definition === undefined ? getDefaultChartThemePreset(effectiveTheme.mode) : definition.resolve(effectiveTheme);
  const overrides = ChartThemeTokenOverridesSchema.parse(spec.chartThemeTokens ?? {});
  const tokens = ChartResolvedThemeTokensSchema.parse({
    ...baseline,
    ...structuredClone(overrides),
  });
  const tokenSources = Object.values(ChartThemeToken).map(token => {
    const local = Object.hasOwn(overrides, token);
    return {
      token,
      kind: ThemeTokenSource.Local,
      path: local
        ? `$spec/chartThemeTokens/${token}`
        : style === undefined
          ? `$default/${effectiveTheme.mode}/${token}`
          : `$style/${style}/${effectiveTheme.mode}/${token}`,
    };
  });
  return { ...(style === undefined ? {} : { style }), mode: effectiveTheme.mode, tokens, tokenSources };
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
