import type { ResolvedTheme } from '@retikz/core';
import type { IRPlotDefaults } from '@retikz/plot';

import type { IRChartDefaults } from '../schemas';

/** Chart 注册主题生成的 owner defaults */
export type ChartThemeDefinition = Readonly<{
  /** 注册主题的唯一名称 */
  name: string;
  /** 可选的已注册父主题名称 */
  base?: string;
  /** Chart shell 的稀疏 Source-shaped 默认片段 */
  defaults?: IRChartDefaults;
  /** 原样转交 Plot owner 的稀疏 Source-shaped 默认片段 */
  plotDefaults?: IRPlotDefaults;
}>;

/** 定义一个 JSON-safe Chart named theme */
export const defineChartTheme = (definition: ChartThemeDefinition): ChartThemeDefinition => definition;

/** Theme resolver 输出的 owner defaults */
export type ChartThemeResolution = Readonly<{
  /** 生成的完整 Chart shell 默认片段 */
  defaults: IRChartDefaults;
  /** 转交 Plot owner 的稀疏默认片段 */
  plotDefaults?: IRPlotDefaults;
  /** Core 主题解析得到的显示模式 */
  mode: ResolvedTheme['mode'];
}>;
