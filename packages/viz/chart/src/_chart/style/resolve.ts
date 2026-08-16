import type { ResolvedTheme, ThemeModeValue, ThemeStyleValue } from '@retikz/core';

import { ThemeTokenSource } from '@retikz/core';

import type {
  ChartThemeTokenSourceRecord,
  IRChartResolvedThemeTokens,
  IRChartThemeTokenOverrides,
} from '../../_shared/style';
import type { ChartThemeStyleDefinition } from './definition';

import { ChartThemeToken } from '../../_shared/style';
import { ChartResolvedThemeTokensSchema, ChartThemeTokenOverridesSchema } from '../../_shared/style';
import { getDefaultChartThemePreset } from './catalog';
import { resolveChartThemeStyleRegistry } from './registry';

/** Chart 主题解析后供展示与类型解析方案共享的上下文 */
export type ResolvedChartThemeContext = {
  /** 最终主题选择的样式定义 */
  style?: ThemeStyleValue;
  /** 最终主题选择的明暗模式 */
  mode: ThemeModeValue;
  /** 样式基线与稀疏覆盖合并后的完整 Chart 令牌 */
  tokens: IRChartResolvedThemeTokens;
  /** 按确定顺序记录的每个令牌来源 */
  tokenSources: Array<ChartThemeTokenSourceRecord>;
};

/** 解析最终主题、Chart 样式基线、稀疏令牌与稳定来源 */
export const resolveChartStyle = (
  effectiveTheme: ResolvedTheme,
  spec: Readonly<{ chartThemeTokens?: IRChartThemeTokenOverrides }>,
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

/** 从 Chart 令牌与 Plot 调色板收窄出类型解析方案允许读取的表现默认值 */
