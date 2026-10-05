import type { IRChartSource } from '@retikz/chart';
import type { CoreProviderContribution } from '@retikz/core';
import type { ExternalRow, DataInputBindings, DataTransformExecutor } from '@retikz/data';
import type { LowerPlotsOptions } from '@retikz/plot';

import type { InputChartCoordinate } from '../../normalize/chart';
import type { ChartRuntimeInput, InputChartPanel } from '../../shared';
import type { TypedChartCommonInput } from './types';

/** 未显式提供 dataRef 时使用的稳定数据引用 */
export const DEFAULT_CHART_DATA_REFERENCE = 'chart.data';

/**
 * Typed Chart factory 在 Source 与运行时之间传递的共享拆分结果
 * @template TNative 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 * @template TSource 当前 chartType 的精确 Chart 输入声明类型，关联 recipe 与运行时组装
 */
export type TypedChartParts<TSource extends IRChartSource, TNative = never> = Readonly<{
  /** 将进入精确 Chart Source 的根字段 */
  root: Readonly<{
    /** 图表的作者身份 */
    id?: string;
    /** 图表引用的数据源名称及字段模型 */
    data: TSource['data'];
    /** 根级稀疏数据执行配置 */
    dataExecution?: TSource['dataExecution'];
    /** 图表的外层尺寸声明 */
    layout?: TSource['layout'];
    /** 待归一化的根坐标系声明 */
    coordinate?: InputChartCoordinate;
    /** 图表表面背景样式 */
    background?: TSource['background'];
    /** 沿正式输入路径组织的稀疏默认值 */
    chartDefaults?: TSource['chartDefaults'];
    /** 显式追加或覆盖的 Plot 所属配置 */
    plotExtension?: TSource['plotExtension'];
  }>;
  /** 由直接行数据构造的具名数据集 */
  datasets: Readonly<Record<string, Array<ExternalRow>>>;
  /** 保留原生源类型的数据绑定，不进入 JSON IR */
  dataBindings?: DataInputBindings<TNative>;
  /** 当前请求使用的数据变换执行器 */
  dataTransformExecutor?: DataTransformExecutor<TNative>;
  /** 当前数据准备请求的取消信号 */
  signal?: AbortSignal;
  /** 当前 chartType 可用的主题定义 */
  themeDefinitions?: TypedChartCommonInput<TSource>['themeDefinitions'];
  /** 共享 Plot 下沉能力及定义的选项 */
  lowerOptions?: LowerPlotsOptions;
  /** 在图表外包裹的可选面板输入 */
  panel?: InputChartPanel;
}>;

/**
 * 把 typed Chart 输入拆分为 JSON-safe Source root 与 runtime 输入
 * @template TNative 原生数据源句柄类型，关联数据绑定与执行器支持的源
 * @template TSource 当前 chartType 的精确 Chart 输入声明类型，关联 recipe 与运行时组装
 */
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

/**
 * 将 typed input 归一为 Source 并复用当前 chartType provider pipeline
 * @template TNative 原生数据源句柄类型，关联数据绑定与执行器支持的源
 * @template TSource 当前 chartType 的精确 Chart 输入声明类型，关联 recipe 与运行时组装
 */
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
