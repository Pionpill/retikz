import type { IRChild, IRJsonObject, ResolvedTheme } from '@retikz/core';
import type { IRPlot } from '@retikz/plot';
import type { IRSurface } from '@retikz/standard';

import type { ChartEncodingRuntime, ChartRecipeDefinition } from '../contract/recipe';
import type { ChartThemeDefinition, ChartThemeResolution } from '../contract/theme';
import type { IRChartSource } from '../schemas';

/** Chart presentation 的固定 slot 解析结果 */
export type ChartPresentationResolution = Readonly<{
  /** title → subtitle → plot → note → source 的最终内容 */
  content: IRChild;
  /** 包含 Chart shell padding 与 canvas 的 Standard Surface */
  surface: IRSurface;
  /** 外部 Chart border-box allocation；不写入 IRPlot */
  layout?: IRChartSource['layout'];
  /** 固定顺序的已消费 presentation slot 名称 */
  slots: ReadonlyArray<'title' | 'subtitle' | 'plot' | 'note' | 'source'>;
}>;

/** Chart resolve 的完整输出 */
export type ChartResolution = Readonly<{
  /** 已经由 recipe 精确 schema parse 的 Source IR */
  source: IRChartSource;
  /** Theme owner slice cascade 的结果 */
  theme: ChartThemeResolution;
  /** 完整且经 PlotSchema 校验的 Plot IR */
  plot: IRPlot;
  /** 需要由当前 compile occurrence 提交的非致命 Chart warning */
  warnings: ReadonlyArray<ChartResolveWarning>;
  /** 固定顺序的 presentation 与 Surface 结果 */
  presentation: ChartPresentationResolution;
}>;

/** Chart resolve 产生、由 Core composite context 定位并提交的 warning */
export type ChartResolveWarning = Readonly<{
  /** 机器可读 Chart warning code */
  code: string;
  /** 面向调用方的英文消息 */
  message: string;
  /** 相对当前 Chart Source occurrence 的 jq-like 路径 */
  subPath?: string;
}>;

/** 已选定 recipe 与命名主题链的 Chart resolve context */
export type SelectedChartResolveContext<TSource extends IRChartSource = IRChartSource> = Readonly<{
  theme: ResolvedTheme;
  recipe: ChartRecipeDefinition<TSource>;
  themeDefinitions: ReadonlyArray<ChartThemeDefinition>;
  /** 与当前Plot lowering共享的owner Definition注册表 */
  runtime: ChartEncodingRuntime;
}>;

/** Mark slot 继承后的值；显式 mark payload 由 mark resolver 自己覆盖 */
export type InheritedChartMarkSlots = Readonly<{
  encodings: IRJsonObject;
  properties: IRJsonObject;
}>;
