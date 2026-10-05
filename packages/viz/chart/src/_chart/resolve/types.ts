import type { IRChild, ResolvedTheme } from '@retikz/core';
import type { JsonObject } from '@retikz/foundation';
import type { IRPlot } from '@retikz/plot';
import type { IRSurface } from '@retikz/standard/presentation';

import type { ChartEncodingRuntime, ChartRecipeDefinition } from '../contract/recipe';
import type { ChartThemeDefinition, ChartThemeResolution } from '../contract/theme';
import type { IRChartSource } from '../schemas';

/** Chart 外部 border-box 的最终有效尺寸 */
export type EffectiveChartLayout = Readonly<{
  /** 最终宽度 */
  width: number;
  /** 最终高度 */
  height: number;
}>;

/** Chart presentation 的固定 slot 解析结果 */
export type ChartPresentationResolution = Readonly<{
  /** title → subtitle → plot → note → source 的最终内容 */
  content: IRChild;
  /** 包含 Chart shell padding 与 canvas 的 Standard Surface */
  surface: IRSurface;
  /** 外部 Chart border-box allocation；不写入 IRPlot */
  layout: EffectiveChartLayout;
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

/**
 * 已选定 recipe 与命名主题链的 Chart resolve context
 * @template TSource 当前 chartType 的精确 Chart 输入声明类型，关联 recipe 与运行时组装
 */
export type SelectedChartResolveContext<TSource extends IRChartSource = IRChartSource> = Readonly<{
  /** 当前位置已解析的 Core 主题上下文 */
  theme: ResolvedTheme;
  /** 与当前精确 Chart Source 配对的 recipe 定义 */
  recipe: ChartRecipeDefinition<TSource>;
  /** 当前编译边界可见的 Chart 主题定义 */
  themeDefinitions: ReadonlyArray<ChartThemeDefinition>;
  /** 与当前Plot lowering共享的owner Definition注册表 */
  runtime: ChartEncodingRuntime;
}>;

/** Mark slot 继承后的值；显式 mark payload 由 mark resolver 自己覆盖 */
export type InheritedChartMarkSlots = Readonly<{
  /** 从 recipe 继承给 mark 的字段映射槽位 */
  encodings: JsonObject;
  /** 从 recipe 继承给 mark 的常量属性槽位 */
  properties: JsonObject;
}>;
