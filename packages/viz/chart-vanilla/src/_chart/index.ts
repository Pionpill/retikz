import type { CompileResult } from '@retikz/core';
import type { RenderToStringOptions } from '@retikz/vanilla';

import { CHART_NAMESPACE } from '@retikz/chart';
import { embed, renderToSvgString, scene, toSceneResult } from '@retikz/vanilla';

import type { ChartAuthoringResult } from '../shared/types';

import { RetikzChartVanillaError } from '../error';
import { ChartInputEmbedAdapter } from './adapter';

export type { InputChartCoordinate } from '../normalize/chart';
export { normalizeChartCoordinate } from '../normalize/chart';
export type { ChartAuthoringResult, ChartHostThemeInput, ChartInput, InputChartPanel } from '../shared';
export { ChartInputEmbedAdapter } from './adapter';

/** Chart 服务端渲染选项 */
export type RenderChartOptions = Omit<RenderToStringOptions, 'adapters' | 'compileDriver'>;

/** Chart 单次编译与服务端渲染结果 */
export type RenderChartResult = Readonly<{
  /** 从同一个 `CompileResult` 场景渲染出的 SVG */
  svg: string;
  /** 该 SVG 直接使用的 Core 编译结果 */
  compileResult: CompileResult;
}>;

/** 通过一次 Core 编译将 Chart 编写结果渲染为 SVG */
export const renderChart = (input: ChartAuthoringResult, options: RenderChartOptions = {}): RenderChartResult => {
  const { compile: compileOptions, ...renderOptions } = options;
  const {
    composites: explicitComposites,
    themeStyles: explicitThemeStyles,
    ...compileOptionsWithoutDefinitions
  } = compileOptions ?? {};
  const themeStyles =
    input.themeStyles === undefined
      ? explicitThemeStyles
      : explicitThemeStyles === undefined
        ? input.themeStyles
        : [...input.themeStyles, ...explicitThemeStyles];
  const result = toSceneResult(
    scene({
      ...(input.theme === undefined ? {} : { theme: input.theme }),
      children: [embed(CHART_NAMESPACE, input.source.id ?? CHART_NAMESPACE, input.input)],
    }),
    {
      adapters: [ChartInputEmbedAdapter],
      compile: {
        ...compileOptionsWithoutDefinitions,
        ...(explicitComposites === undefined ? {} : { composites: explicitComposites }),
        ...(themeStyles === undefined ? {} : { themeStyles }),
      },
    },
  );
  if (result.compileResult === undefined) {
    throw new RetikzChartVanillaError('chart vanilla: InputScene processing must produce a Core compile result');
  }
  const svg = renderToSvgString(result.scene, renderOptions);
  return { svg, compileResult: result.compileResult };
};
