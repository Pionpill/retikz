import { prepareChartData } from '@retikz/chart';
import type { IRChartSource } from '@retikz/chart';
import type { CoreProviderContribution } from '@retikz/core';
import type { PlotDataPreparationOptions, PlotsLoweringOptions } from '@retikz/plot';
import type { CompileResult } from '@retikz/reconciler';
import type { ProcessingOptions, RenderToStringOptions } from '@retikz/vanilla';
import { renderToSvgString, scene, compileToScene, embed } from '@retikz/vanilla';
import type { AnyInputEmbed } from '@retikz/vanilla';

import { lowerChartInput } from '../shared';
import type { InputChartPanel, InputChartHostTheme } from '../shared';

export type { InputChartCoordinate } from '../normalize/chart';
export { normalizeChartCoordinate } from '../normalize/chart';
export type { InputChartHostTheme, InputChartPanel } from '../shared';

/** Chart 服务端渲染选项 */
export type ChartRenderOptions = RenderToStringOptions & Pick<ProcessingOptions, 'compile'>;

/** Chart 单次编译与服务端渲染结果 */
export type ChartRenderResult = Readonly<{
  /** 从同一个 `CompileResult` 场景渲染出的 SVG */
  svg: string;
  /** 该 SVG 直接使用的 Core 编译结果 */
  compileResult: CompileResult;
}>;

/** Chart 异步服务端渲染选项 */
export type ChartRenderAsyncOptions<TSource = never> = ChartRenderOptions &
  InputChartHostTheme &
  Omit<PlotDataPreparationOptions<TSource>, 'lineage'> & {
    /** 与当前 Chart recipe 配套的 provider */
    chartProviderContribution: CoreProviderContribution;
    /** 领域准备与同步绘图共享的配置 */
    lowerOptions?: PlotsLoweringOptions;
    /** Chart 的宿主面板 */
    panel?: InputChartPanel;
  };

type InputChartRender = AnyInputEmbed & { props: InputChartHostTheme & { layout?: IRChartSource['layout'] } };

/** 两种入口共用相同的Scene与Core配置 */
const chartRenderRequest = (input: InputChartRender, compile: ChartRenderOptions['compile']) => {
  const themeDefinitions =
    input.props.themeDefinitions === undefined
      ? compile?.themeDefinitions
      : compile?.themeDefinitions === undefined
        ? input.props.themeDefinitions
        : [...input.props.themeDefinitions, ...compile.themeDefinitions];
  const layout = input.props.layout;

  return {
    source: scene({
      ...(layout?.width !== undefined && layout.height !== undefined
        ? { viewBox: { x: 0, y: 0, width: layout.width, height: layout.height } }
        : {}),
      ...(input.props.theme === undefined ? {} : { theme: input.props.theme }),
      children: [input],
    }),
    compile: { ...compile, ...(themeDefinitions === undefined ? {} : { themeDefinitions }) },
  };
};

/** 通过一次同步Core编译渲染Chart */
export const renderChart = (input: InputChartRender, options: ChartRenderOptions = {}): ChartRenderResult => {
  const { compile, ...renderOptions } = options;
  const request = chartRenderRequest(input, compile);
  const result = compileToScene(request.source, { compile: request.compile });

  return { svg: renderToSvgString(result.compileResult.scene, renderOptions), compileResult: result.compileResult };
};

/** 只等待显式 Chart 领域计算，再同步编译同一份就绪结果 */
export const renderChartAsync = async <TSource = never>(
  source: IRChartSource,
  options: ChartRenderAsyncOptions<TSource>,
): Promise<ChartRenderResult> => {
  const {
    chartProviderContribution,
    lowerOptions,
    panel,
    theme,
    themeDefinitions,
    dataBindings,
    dataTransformExecutor,
    signal,
    ...renderOptions
  } = options;
  const preparation = await prepareChartData(
    source,
    { dataBindings, dataTransformExecutor, signal },
    chartProviderContribution,
    lowerOptions,
  );
  const preparedData = await preparation.execute();
  return renderChart(
    embed({
      adapter: { kind: source.namespace, lower: lowerChartInput },
      props: {
        source,
        layout: source.layout,
        theme,
        themeDefinitions,
        panel,
        datasets: {},
        preparedData,
        chartProviderContribution,
        lowerOptions,
      },
    }),
    renderOptions,
  );
};
