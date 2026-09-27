import type { CompileResult } from '@retikz/core';
import type { RenderToStringOptions } from '@retikz/vanilla';
import { renderToSvgString, scene, toSceneResult } from '@retikz/vanilla';
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

/** 通过一次 Core 编译将 Chart 编写结果渲染为 SVG */
export const renderChart = (
  input: InputEmbed<ChartHostThemeInput>,
  options: RenderChartOptions,
): RenderChartResult => {
  const { compile: compileOptions, adapters, ...renderOptions } = options;
  const {
    composites: explicitComposites,
    themeStyles: explicitThemeStyles,
    ...compileOptionsWithoutDefinitions
  } = compileOptions ?? {};
  const themeStyles =
    input.props.themeStyles === undefined
      ? explicitThemeStyles
      : explicitThemeStyles === undefined
        ? input.props.themeStyles
        : [...input.props.themeStyles, ...explicitThemeStyles];
  const result = toSceneResult(
    scene({
      ...(input.props.theme === undefined ? {} : { theme: input.props.theme }),
      children: [input],
    }),
    {
      adapters,
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
