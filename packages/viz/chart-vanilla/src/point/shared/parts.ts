import type { IRChartSource } from '@retikz/chart';
import type { CoreProviderContribution } from '@retikz/core';
import type { ExternalRow, DataInputBindings, DataTransformExecutor } from '@retikz/data';
import type { LowerPlotsOptions } from '@retikz/plot';

import type { InputChartCoordinate } from '../../normalize/chart';
import type { ChartRuntimeInput, InputChartPanel } from '../../shared';
import type { TypedChartCommonInput } from './types';

/** 未显式提供 dataRef 时使用的稳定数据引用 */
export const DEFAULT_CHART_DATA_REFERENCE = 'chart.data';

/** Typed Chart factory 在 Source 与运行时之间传递的共享拆分结果 */
export type TypedChartParts<TSource extends IRChartSource, TNative = never> = Readonly<{
  root: Readonly<{
    id?: string;
    data: TSource['data'];
    dataExecution?: TSource['dataExecution'];
    layout?: TSource['layout'];
    coordinate?: InputChartCoordinate;
    background?: TSource['background'];
    chartDefaults?: TSource['chartDefaults'];
    plotExtension?: TSource['plotExtension'];
  }>;
  datasets: Readonly<Record<string, Array<ExternalRow>>>;
  dataBindings?: DataInputBindings<TNative>;
  dataTransformExecutor?: DataTransformExecutor<TNative>;
  signal?: AbortSignal;
  themeDefinitions?: TypedChartCommonInput<TSource>['themeDefinitions'];
  lowerOptions?: LowerPlotsOptions;
  panel?: InputChartPanel;
}>;

/** 把 typed Chart 输入拆分为 JSON-safe Source root 与 runtime 输入 */
export const typedChartPartsOf = <TSource extends IRChartSource, TNative>(
  input: TypedChartCommonInput<TSource, TNative>,
): TypedChartParts<TSource, TNative> => {
  const {
    data,
    dataRef,
    dataModel,
    layout,
    coordinate,
    id,
    themeDefinitions,
    background,
    chartDefaults,
    lowerOptions,
    panel,
  } = input;
  const reference = dataRef ?? DEFAULT_CHART_DATA_REFERENCE;

  return {
    root: {
      ...(id === undefined ? {} : { id }),
      data: {
        reference,
        ...(dataModel === undefined ? {} : { model: dataModel }),
      },
      ...(input.dataExecution === undefined ? {} : { dataExecution: input.dataExecution }),
      ...(layout === undefined ? {} : { layout }),
      ...(coordinate === undefined ? {} : { coordinate }),
      ...(background === undefined ? {} : { background }),
      ...(chartDefaults === undefined ? {} : { chartDefaults }),
      ...(input.plotExtension === undefined ? {} : { plotExtension: input.plotExtension }),
    },
    datasets: data === undefined ? {} : { [reference]: data },
    ...(input.dataBindings === undefined ? {} : { dataBindings: input.dataBindings }),
    ...(input.dataTransformExecutor === undefined ? {} : { dataTransformExecutor: input.dataTransformExecutor }),
    ...(input.signal === undefined ? {} : { signal: input.signal }),
    ...(themeDefinitions === undefined ? {} : { themeDefinitions }),
    ...(lowerOptions === undefined ? {} : { lowerOptions }),
    ...(panel === undefined ? {} : { panel }),
  };
};

/** 将 typed input 归一为 Source 并复用当前 chartType provider pipeline */
export const buildPointChartRuntime = <TSource extends IRChartSource, TNative>(
  source: TSource,
  parts: TypedChartParts<TSource, TNative>,
  provider: CoreProviderContribution,
): ChartRuntimeInput<TSource, TNative> => ({
  source,
  datasets: parts.datasets,
  ...(parts.dataBindings === undefined ? {} : { dataBindings: parts.dataBindings }),
  ...(parts.dataTransformExecutor === undefined ? {} : { dataTransformExecutor: parts.dataTransformExecutor }),
  ...(parts.signal === undefined ? {} : { signal: parts.signal }),
  chartProviderContribution: provider,
  ...(parts.lowerOptions === undefined ? {} : { lowerOptions: parts.lowerOptions }),
  ...(parts.panel === undefined ? {} : { panel: parts.panel }),
});
