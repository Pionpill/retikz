import type { ChartRecipeStyleContext, InternalChartSpecBound } from '../../providers';
import type { ResolvedChartStyleContext } from './types';

import { getChartStylePreset } from '../../providers';
import {
  ChartResolvedStyleTokensSchema,
  ChartStyle,
  ChartStyleAuthoredOverride,
  ChartStyleToken,
  ChartStyleTokenSource,
  ChartThemeMode,
} from '../../schemas';

/** 解析默认 preset/mode、稀疏 token 与稳定 inspection 来源 */
export const resolveChartStyle = (spec: InternalChartSpecBound): ResolvedChartStyleContext => {
  const style = spec.style ?? ChartStyle.Neutral;
  const themeMode = spec.themeMode ?? ChartThemeMode.Light;
  const preset = getChartStylePreset(style, themeMode);
  const overrides = spec.styleTokens ?? {};
  const tokens = ChartResolvedStyleTokensSchema.parse({ ...preset, ...structuredClone(overrides) });
  const tokenSources = Object.values(ChartStyleToken).map(token => {
    const overridden = Object.hasOwn(overrides, token);
    return {
      token,
      kind: overridden ? ChartStyleTokenSource.StyleToken : ChartStyleTokenSource.Preset,
      path: overridden ? `$spec/styleTokens/${token}` : `$preset/${style}/${themeMode}/${token}`,
    };
  });
  const authoredOverrides = [
    ...(spec.colors === undefined ? [] : [{ kind: ChartStyleAuthoredOverride.Colors, path: '$spec/colors' }]),
    ...(spec.theme === undefined ? [] : [{ kind: ChartStyleAuthoredOverride.Theme, path: '$spec/theme' }]),
  ];
  return { style, themeMode, tokens, tokenSources, authoredOverrides };
};

/** 从完整 token 中收窄出 recipe 允许读取的 topology defaults */
export const chartRecipeStyleContextOf = (context: ResolvedChartStyleContext): ChartRecipeStyleContext => ({
  axisEnabled: context.tokens[ChartStyleToken.AxisEnabled],
  axisGridEnabled: context.tokens[ChartStyleToken.AxisGridEnabled],
  legendEnabled: context.tokens[ChartStyleToken.LegendEnabled],
});
