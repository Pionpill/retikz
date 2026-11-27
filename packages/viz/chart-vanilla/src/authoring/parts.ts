import type { IRChartSource } from '@retikz/chart';
import type { CoreProviderContribution } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import type { PreparedPlotData } from '@retikz/plot';
import type { PlotsLoweringOptions } from '@retikz/plot';

import type { InputChartCoordinate } from '../normalize/chart';
import type { InputChartRuntime, InputChartPanel } from '../shared';
import type { InputChartCommon } from './types';

/** 未显式提供 dataRef 时使用的稳定数据引用 */
const DEFAULT_CHART_DATA_REFERENCE = 'chart.data';

/**
 * Typed Chart factory 在 Source 与运行时之间传递的共享拆分结果
 * @template TSource 当前 chartType 的精确 Chart 输入声明类型，关联 recipe 与运行时组装
 */
type TypedChartParts<TSource extends IRChartSource> = Readonly<{
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
    defaultChart?: TSource['defaultChart'];
    /** 显式追加或覆盖的 Plot 所属配置 */
    plotExtension?: TSource['plotExtension'];
  }>;
  /** 由直接行数据构造的具名数据集 */
  datasets: Readonly<Record<string, Array<ExternalRow>>>;
  /** 已完成的 Plot 数据，不进入 JSON IR */
  preparedData?: PreparedPlotData;
  /** 当前 chartType 可用的主题定义 */
  chartThemeDefinitions?: InputChartCommon<TSource>['chartThemeDefinitions'];
  /** 共享 Plot 下沉能力及定义的选项 */
  lowerOptions?: PlotsLoweringOptions;
  /** 在图表外包裹的可选面板输入 */
  panel?: InputChartPanel;
}>;

/**
 * 把 typed Chart 输入拆分为 JSON-safe Source root 与 runtime 输入
 * @template TSource 当前 chartType 的精确 Chart 输入声明类型，关联 recipe 与运行时组装
 */
export const typedChartPartsOf = <TSource extends IRChartSource>(
  input: InputChartCommon<TSource>,
): TypedChartParts<TSource> => {
  const {
    data,
    dataRef,
    dataModel,
    layout,
    coordinate,
    id,
    chartThemeDefinitions,
    background,
    defaultChart,
    lowerOptions,
    panel,
    dataExecution,
    plotExtension,
    preparedData,
  } = input;
  const reference = dataRef ?? DEFAULT_CHART_DATA_REFERENCE;

  return {
    root: {
      ...(id === undefined ? {} : { id }),
      data: {
        reference,
        ...(dataModel === undefined ? {} : { model: dataModel }),
      },
      ...(dataExecution === undefined ? {} : { dataExecution }),
      ...(layout === undefined ? {} : { layout }),
      ...(coordinate === undefined ? {} : { coordinate }),
      ...(background === undefined ? {} : { background }),
      ...(defaultChart === undefined ? {} : { defaultChart }),
      ...(plotExtension === undefined ? {} : { plotExtension }),
    },
    datasets: data === undefined ? {} : { [reference]: data },
    ...(preparedData === undefined ? {} : { preparedData }),
    ...(chartThemeDefinitions === undefined ? {} : { chartThemeDefinitions }),
    ...(lowerOptions === undefined ? {} : { lowerOptions }),
    ...(panel === undefined ? {} : { panel }),
  };
};

/**
 * 将 typed input 归一为 Source 并复用当前 chartType provider pipeline
 * @template TSource 当前 chartType 的精确 Chart 输入声明类型，关联 recipe 与运行时组装
 */
export const buildChartRuntime = <TSource extends IRChartSource>(
  source: TSource,
  parts: TypedChartParts<TSource>,
  provider: CoreProviderContribution,
): InputChartRuntime<TSource> => ({
  source,
  datasets: parts.datasets,
  ...(parts.preparedData === undefined ? {} : { preparedData: parts.preparedData }),
  chartProviderContribution: provider,
  ...(parts.lowerOptions === undefined ? {} : { lowerOptions: parts.lowerOptions }),
  ...(parts.panel === undefined ? {} : { panel: parts.panel }),
});
