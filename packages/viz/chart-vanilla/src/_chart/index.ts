import type { IRChartSource } from '@retikz/chart';
import type { CompileResult } from '@retikz/core';
import type { RenderToStringOptions, AsyncProcessingOptions } from '@retikz/vanilla';
import { renderToSvgString, scene, toSceneResult, processToStaticInputResultAsync } from '@retikz/vanilla';
import type { InputEmbed } from '@retikz/vanilla';

import { RetikzChartVanillaError } from '../error';
import type { ChartHostThemeInput } from '../shared';

export type { InputChartCoordinate } from '../normalize/chart';
export { normalizeChartCoordinate } from '../normalize/chart';
export type { ChartHostThemeInput, InputChartPanel } from '../shared';

/** Chart 服务端渲染选项 */
export type RenderChartOptions = Omit<RenderToStringOptions, 'adapters' | 'compileDriver'> & {
  /** 当前图表的 Vanilla adapter */
  adapters: NonNullable<RenderToStringOptions['adapters']>;
};

/** Chart 单次编译与服务端渲染结果 */
export type RenderChartResult = Readonly<{
  /** 从同一个 `CompileResult` 场景渲染出的 SVG */
  svg: string;
  /** 该 SVG 直接使用的 Core 编译结果 */
  compileResult: CompileResult;
}>;

/** Chart 异步服务端渲染选项 */
export type RenderChartAsyncOptions = Omit<RenderChartOptions, 'adapters'> & {
  /** 当前图表支持prepare的adapter */
  adapters: NonNullable<AsyncProcessingOptions['adapters']>;
  /** 本次请求取消信号 */
  signal?: AbortSignal;
};

type ChartRenderInput = InputEmbed<ChartHostThemeInput & { layout?: IRChartSource['layout'] }>;

/** 两种入口共用相同的Scene与Core配置，异步生命周期由Vanilla负责 */
const chartRenderRequest = (input: ChartRenderInput, compile: RenderChartOptions['compile']) => {
  const themeStyles =
    input.props.themeStyles === undefined
      ? compile?.themeStyles
      : compile?.themeStyles === undefined
        ? input.props.themeStyles
        : [...input.props.themeStyles, ...compile.themeStyles];
  const layout = input.props.layout;
  return {
    source: scene({
      ...(layout?.width !== undefined && layout.height !== undefined
        ? { viewBox: { x: 0, y: 0, width: layout.width, height: layout.height } }
        : {}),
      ...(input.props.theme === undefined ? {} : { theme: input.props.theme }),
      children: [input],
    }),
    compile: { ...compile, ...(themeStyles === undefined ? {} : { themeStyles }) },
  };
};

/** 通过一次同步Core编译渲染Chart */
export const renderChart = (input: ChartRenderInput, options: RenderChartOptions): RenderChartResult => {
  const { compile, adapters, ...renderOptions } = options;
  const request = chartRenderRequest(input, compile);
  const result = toSceneResult(request.source, { adapters, compile: request.compile });
  if (result.compileResult === undefined)
    throw new RetikzChartVanillaError('Chart processing must produce a Core compile result');
  return { svg: renderToSvgString(result.scene, renderOptions), compileResult: result.compileResult };
};

/** 准备完整作者树后通过同一Core编译渲染Chart，支持Promise计算 */
export const renderChartAsync = async (
  input: ChartRenderInput,
  options: RenderChartAsyncOptions,
): Promise<RenderChartResult> => {
  const { compile, adapters, signal, ...renderOptions } = options;
  const request = chartRenderRequest(input, compile);
  const result = await processToStaticInputResultAsync(request.source, { adapters, signal, compile: request.compile });
  return { svg: renderToSvgString(result.scene, renderOptions), compileResult: result.compileResult };
};
