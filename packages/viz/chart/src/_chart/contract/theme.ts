import type { IRJsonObject, ResolvedTheme } from '@retikz/core';
import type { IRPlotThemeTokenOverrides } from '@retikz/plot';

import type { IRChartThemeOverrides, IRChartThemeResolution } from '../schemas';

/** Chart 注册主题的声明式 owner slices */
export type ChartThemeDefinition = Readonly<{
  /** 注册主题的唯一名称 */
  name: string;
  /** 可选的已注册父主题名称 */
  base?: string;
  /** 按 owner 分隔的稀疏主题 token */
  tokens?: Readonly<{
    /** Chart shell 拥有的主题 token */
    chart?: IRChartThemeOverrides;
    /** 转交 Plot owner 的主题 token */
    plot?: IRPlotThemeTokenOverrides;
    /** 按 chartType 保存的 recipe 主题 token */
    recipes?: Readonly<Record<string, IRJsonObject>>;
  }>;
}>;

/** 定义一个 JSON-safe Chart named theme */
export const defineChartTheme = (definition: ChartThemeDefinition): ChartThemeDefinition => definition;

/** Theme resolver 输出的 owner slices */
export type ChartThemeResolution = Readonly<{
  /** 已补全的 Chart shell 主题 token */
  chart: IRChartThemeResolution;
  /** 转交 Plot owner 的稀疏主题 token */
  plot?: IRPlotThemeTokenOverrides;
  /** 当前 chartType 已补全的 recipe 主题 token */
  recipe: IRJsonObject;
  /** Core 主题解析得到的显示模式 */
  mode: ResolvedTheme['mode'];
}>;
