import type { DataInputBindings, DataTransformExecutor } from '@retikz/data';
import type { IRPlot, PreparedPlotData } from '@retikz/plot';
import { lowerPlotWithLineage } from '@retikz/plot';
import { embed, processToStaticInputResultAsync, renderToSvgString, scene } from '@retikz/vanilla';

import { plotInputEmbedAdapter } from '../adapter';
import { RetikzPlotVanillaError } from '../error';
import type { InputPlotEmbed } from '../spec';
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

/** 通过共享 Vanilla 作者准备运行 Plot，返回同一数据准备结果的 SVG 与可选链路 */
const renderPlotAsyncImpl = async <TSource = never>(
  spec: IRPlot,
  dataBindings: DataInputBindings<TSource>,
  options: PlotRenderAsyncOptions<TSource> | PlotRenderAsyncLineageOptions<TSource> = {},
): Promise<string | PlotRenderLineageResult> => {
  const { dataTransformExecutor, signal, ...lowerOptions } = options;
  const props: InputPlotEmbed<TSource> = { spec, dataBindings, dataTransformExecutor, lowerOptions };
  let preparedData: PreparedPlotData | undefined;
  const lineage = options.lineage === undefined || options.lineage === false ? undefined : (options.lineage.data ?? {});
  const adapter = {
    kind: plotInputEmbedAdapter.kind,
    prepare: async (_props: never, context: Parameters<typeof plotInputEmbedAdapter.prepare>[1]) => {
      const prepared = await plotInputEmbedAdapter.prepare(props, context, lineage);
      return {
        execute: async () => {
          const contribution = await prepared.execute();
          preparedData = contribution.runtimeInputs[0].input;
          return contribution;
        },
      };
    },
  };

  const result = await processToStaticInputResultAsync(
    scene({
      ...(options.theme === undefined ? {} : { theme: options.theme }),
      children: [embed({ kind: adapter.kind, props })],
    }),
    {
      adapters: [adapter],
      signal,
      compile: { themeDefinitions: options.themeDefinitions },
    },
  );

  const svg = renderToSvgString(result.scene, {
    output: { width: options.layout?.width, height: options.layout?.height },
  });
  if (options.lineage === undefined || options.lineage === false) return svg;
  if (preparedData === undefined) throw new RetikzPlotVanillaError('Plot async result is missing its prepared data');

  return {
    svg,
    lineage: lowerPlotWithLineage(
      spec,
      {},
      { ...options, environment: { theme: options.theme, compile: { themeDefinitions: options.themeDefinitions } } },
      preparedData,
    ).lineage,
  };
};

/** 以 Promise 渲染规范数据绑定，与同步入口保持相同的 SVG/lineage 返回形态 */
export const renderPlotAsync = renderPlotAsyncImpl as AsyncPlotRenderer;
