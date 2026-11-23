import type { DataInputBindings, DataTransformExecutor } from '@retikz/data';
import type { IRPlot } from '@retikz/plot';
import { lowerPlotWithLineage, preparePlotData } from '@retikz/plot';
import { embed, compileToScene, renderToSvgString, scene } from '@retikz/vanilla';

import { plotInputEmbedAdapter } from '../adapter';
import type { PlotRenderLineageOptions, PlotRenderLineageResult, PlotRenderOptions } from './render-plot';

/**
 * 异步 Plot 的执行器及取消配置，不进入 Source
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源
 */
export type PlotRenderAsyncRuntimeOptions<TSource> = Readonly<{
  /** 本次执行的 Data 策略 */
  dataTransformExecutor?: DataTransformExecutor<TSource>;
  /** 中止本次准备与计算 */
  signal?: AbortSignal;
}>;

/**
 * 异步 Plot 默认渲染配置
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type PlotRenderAsyncOptions<TSource = never> = PlotRenderOptions & PlotRenderAsyncRuntimeOptions<TSource>;

/**
 * 异步 Plot 图元链路配置
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type PlotRenderAsyncLineageOptions<TSource = never> = PlotRenderLineageOptions &
  PlotRenderAsyncRuntimeOptions<TSource>;

type AsyncPlotRenderer = {
  /**
   * 异步完成数据准备并返回 SVG 与图元来源链路
   * @template TSource 数据绑定与执行器支持的原生源类型，默认 never 表示不接入原生源
   */
  <TSource = never>(
    spec: IRPlot,
    dataBindings: DataInputBindings<TSource>,
    options: PlotRenderAsyncLineageOptions<TSource>,
  ): Promise<PlotRenderLineageResult>;
  /**
   * 异步完成数据准备并返回 SVG 字符串
   * @template TSource 数据绑定与执行器支持的原生源类型，默认 never 表示不接入原生源
   */
  <TSource = never>(
    spec: IRPlot,
    dataBindings: DataInputBindings<TSource>,
    options?: PlotRenderAsyncOptions<TSource>,
  ): Promise<string>;
};

/** 等待 Plot 数据计算后同步绘图，返回同一数据准备结果的 SVG 与可选链路 */
const renderPlotAsyncImpl = async <TSource = never>(
  spec: IRPlot,
  dataBindings: DataInputBindings<TSource>,
  options: PlotRenderAsyncOptions<TSource> | PlotRenderAsyncLineageOptions<TSource> = {},
): Promise<string | PlotRenderLineageResult> => {
  const { dataTransformExecutor, signal, ...lowerOptions } = options;
  const { lineage: optionsLineage, theme, themeDefinitions, layout } = lowerOptions;
  const lineage = optionsLineage === undefined || optionsLineage === false ? undefined : (optionsLineage.data ?? {});
  const preparation = await preparePlotData(
    spec,
    { dataBindings, dataTransformExecutor, signal, lineage },
    lowerOptions,
  );
  const preparedData = await preparation.execute();
  const result = compileToScene(
    scene({
      ...(theme === undefined ? {} : { theme }),
      children: [embed({ adapter: plotInputEmbedAdapter, props: { spec, preparedData, lowerOptions } })],
    }),
    {
      compile: { themeDefinitions },
    },
  );

  const svg = renderToSvgString(result.scene, {
    output: { width: layout?.width, height: layout?.height },
  });
  if (optionsLineage === undefined || optionsLineage === false) return svg;

  return {
    svg,
    lineage: lowerPlotWithLineage(
      spec,
      {},
      { ...options, environment: { theme, compile: { themeDefinitions } } },
      preparedData,
    ).lineage,
  };
};

/** 以 Promise 渲染规范数据绑定，与同步入口保持相同的 SVG/lineage 返回形态 */
export const renderPlotAsync = renderPlotAsyncImpl as AsyncPlotRenderer;
