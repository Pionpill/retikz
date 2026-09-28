import type { IRChartSource } from '@retikz/chart';
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

/** 通过一次 Core 编译将 Chart 编写结果渲染为 SVG；完整布局尺寸作为取景范围，输出尺寸只控制显示大小 */
export const renderChart = (
  input: InputEmbed<ChartHostThemeInput & { layout?: IRChartSource['layout'] }>,
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
  const layout = input.props.layout;
  const result = toSceneResult(
    scene({
      ...(layout?.width !== undefined && layout.height !== undefined
        ? { viewBox: { x: 0, y: 0, width: layout.width, height: layout.height } }
        : {}),
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
