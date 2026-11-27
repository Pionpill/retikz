import type { ChartThemeDefinition, IRChartSource } from '@retikz/chart';
import type { IRScene, ThemeDefinition } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import type { RequireExactlyOne } from '@retikz/foundation';
import type { PreparedPlotData } from '@retikz/plot';
import type { PlotsLoweringOptions } from '@retikz/plot';

import type { InputChartCoordinate, InputChartPresentation } from '../normalize/chart';
import type { InputChartPanel } from '../shared';

/**
 * Chart 各 concrete chartType 共用的 Vanilla 输入字段
 * @template TSource 当前 chartType 的精确 Chart 输入声明类型，关联 recipe 与运行时组装
 */
export type InputChartCommon<TSource extends IRChartSource> = InputChartPresentation &
  RequireExactlyOne<{
    /** 直接输入的行数据，与 preparedData 互斥 */
    data: Array<ExternalRow>;
    /** 当前图表已完成的数据计算，与 data 互斥 */
    preparedData: PreparedPlotData;
  }> &
  Readonly<{
    /** 根级执行配置 */
    dataExecution?: TSource['dataExecution'];
    /** 稳定的数据引用；省略时固定为 `chart.data` */
    dataRef?: string;
    /** 可选的 Plot 数据模型 */
    dataModel?: TSource['data']['model'];
    /** Chart 外层尺寸 */
    layout?: TSource['layout'];
    /** Chart 根坐标系选择 */
    coordinate?: InputChartCoordinate;
    /** Chart Source 身份 */
    id?: string;
    /** 图表表面的背景样式 */
    background?: TSource['background'];
    /** 沿用图表输入结构的稀疏默认值 */
    defaultChart?: TSource['defaultChart'];
    /** Core host Theme 环境 */
    theme?: IRScene['theme'];
    /** 当前编译边界可见的命名 Chart Theme Definition */
    chartThemeDefinitions?: ReadonlyArray<ChartThemeDefinition>;
    /** Plot lowering 的运行时选项 */
    lowerOptions?: PlotsLoweringOptions;
    /** Chart Source 外层宿主 Scope */
    panel?: InputChartPanel;
    /** Core 宿主的主题定义 */
    themeDefinitions?: ReadonlyArray<ThemeDefinition>;
    /** 显式 Plot-owned fragment */
    plotExtension?: TSource['plotExtension'];
  }>;

/**
 * 从精确 Chart Source 推导对应的 plain normalizer 输入
 * @template TSource 当前 chartType 的精确 Chart 输入声明类型，关联 recipe 与运行时组装
 */
export type InputTypedChart<TSource extends { data: object; recipe: object }> = InputChartPresentation &
  Omit<TSource, 'namespace' | 'type' | 'presentation' | 'recipe' | 'coordinate'> &
  Readonly<{
    /** 接受作者简写的根坐标系输入 */
    coordinate?: InputChartCoordinate;
  }> &
  Omit<TSource['recipe'], 'chartType'>;
