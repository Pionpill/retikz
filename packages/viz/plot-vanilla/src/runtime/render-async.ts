import type { DataInputBindings, DataTransformExecutor } from '@retikz/data';
import type { IRPlot, PreparedPlotData } from '@retikz/plot';
import { lowerPlotWithLineage } from '@retikz/plot';
import { embed, processToStaticInputResultAsync, renderToSvgString, scene } from '@retikz/vanilla';

import { PlotInputEmbedAdapter } from '../adapter';
import { RetikzPlotVanillaError } from '../error';
import type { InputPlotEmbed } from '../spec';
import type { RenderPlotLineageOptions, RenderPlotLineageResult, RenderPlotOptions } from './render-plot';

/** 异步 Plot 的执行器及取消配置，不进入 Source */
export type RenderPlotAsyncRuntimeOptions<TSource> = Readonly<{
  /** 本次执行的 Data 策略 */
  dataTransformExecutor?: DataTransformExecutor<TSource>;
  /** 中止本次准备与计算 */
  signal?: AbortSignal;
}>;

/** 异步 Plot 默认渲染配置 */
export type RenderPlotAsyncOptions<TSource = never> = RenderPlotOptions & RenderPlotAsyncRuntimeOptions<TSource>;

/** 异步 Plot 图元链路配置 */
export type RenderPlotAsyncLineageOptions<TSource = never> = RenderPlotLineageOptions &
  RenderPlotAsyncRuntimeOptions<TSource>;

type RenderPlotAsync = {
  <TSource = never>(
    spec: IRPlot,
    dataBindings: DataInputBindings<TSource>,
    options: RenderPlotAsyncLineageOptions<TSource>,
  ): Promise<RenderPlotLineageResult>;
  <TSource = never>(
    spec: IRPlot,
    dataBindings: DataInputBindings<TSource>,
    options?: RenderPlotAsyncOptions<TSource>,
  ): Promise<string>;
};

/** 通过共享 Vanilla 作者准备运行 Plot，返回同一数据准备结果的 SVG 与可选链路 */
const renderPlotAsyncImpl = async <TSource = never>(
  spec: IRPlot,
  dataBindings: DataInputBindings<TSource>,
  options: RenderPlotAsyncOptions<TSource> | RenderPlotAsyncLineageOptions<TSource> = {},
): Promise<string | RenderPlotLineageResult> => {
  const { dataTransformExecutor, signal, ...lowerOptions } = options;
  const props: InputPlotEmbed<TSource> = { spec, dataBindings, dataTransformExecutor, lowerOptions };
  let preparedData: PreparedPlotData | undefined;
  const lineage = options.lineage === undefined || options.lineage === false ? undefined : (options.lineage.data ?? {});
  const adapter = {
    kind: PlotInputEmbedAdapter.kind,
    prepare: async (_props: never, context: Parameters<typeof PlotInputEmbedAdapter.prepare>[1]) => {
      const prepared = await PlotInputEmbedAdapter.prepare(props, context, lineage);
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
      compile: { themeStyles: options.themeStyles },
    },
  );

  const svg = renderToSvgString(result.scene, { output: { width: options.width, height: options.height } });
  if (options.lineage === undefined || options.lineage === false) return svg;
  if (preparedData === undefined) throw new RetikzPlotVanillaError('Plot async result is missing its prepared data');

  return { svg, lineage: lowerPlotWithLineage(spec, {}, options, preparedData).lineage };
};

/** 以 Promise 渲染规范数据绑定，与同步入口保持相同的 SVG/lineage 返回形态 */
export const renderPlotAsync = renderPlotAsyncImpl as RenderPlotAsync;
