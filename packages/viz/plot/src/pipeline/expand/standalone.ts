import type { CompileOptions, IRScene, IRScope } from '@retikz/core';
import { compileToScene, defineComposite } from '@retikz/core';
import type { DataLineageOptions, ExternalDatasets } from '@retikz/data';

import type { PreparedPlotData } from '../../contract';
import type { IRPlot } from '../../schemas';
import { PLOT_NAMESPACE, PlotSchema } from '../../schemas';
import { createPlotTextMeasurer } from '../../shared';
import type { PlotDataArtifactLowerResult } from './lower';
import { lowerPlotWithDataArtifact } from './lower';
import type { PlotsLoweringOptions } from './types';

/** 独立下沉所用的 Core 环境，调用方应与实际绘制保持一致 */
export type PlotCompileEnvironment = {
  /** 根场景的主题输入 */
  theme?: IRScene['theme'];
  /** Plot 所在作用域的继承默认值 */
  defaults?: IRScope['defaults'];
  /** 宿主文字测量、TeX 与主题定义等 Core 编译能力 */
  compile?: Omit<CompileOptions, 'compositeInputs' | 'composites'>;
};

/** 独立入口必须显式选择 Core 环境，空对象表示采用 Core 默认环境 */
export type PlotStandaloneOptions = PlotsLoweringOptions & {
  /** 本次下沉的 Core 环境 */
  environment: PlotCompileEnvironment;
};

/** 在一次 Core 编译上下文内完成独立下沉，标签共享宿主环境 */
export const lowerStandalonePlot = (
  spec: IRPlot,
  datasets: ExternalDatasets,
  options: PlotStandaloneOptions,
  lineageOptions?: DataLineageOptions,
  preparedData?: PreparedPlotData,
): PlotDataArtifactLowerResult => {
  let lowered!: PlotDataArtifactLowerResult;
  const definition = defineComposite({
    namespace: PLOT_NAMESPACE,
    type: 'plot',
    schema: PlotSchema,
    compile: (node: IRPlot, context) => {
      lowered = lowerPlotWithDataArtifact(
        node,
        datasets,
        { ...options, textMeasurer: createPlotTextMeasurer(context) },
        context.theme,
        lineageOptions,
        preparedData,
      );
      return { children: [] };
    },
  });
  compileToScene(
    {
      version: 1,
      type: 'scene',
      ...(options.environment.theme === undefined ? {} : { theme: options.environment.theme }),
      children:
        options.environment.defaults === undefined
          ? [spec]
          : [{ type: 'scope', defaults: options.environment.defaults, children: [spec] }],
    },
    {
      ...options.environment.compile,
      // 独立 Source 使用显式 preparedData，不能复用宿主 Source 的实例输入绑定
      compositeInputs: undefined,
      composites: [definition],
    },
  );
  return lowered;
};
