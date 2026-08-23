import type { ChartThemeDefinition, IRChartSource } from '@retikz/chart';
import type { IRScene, ThemeStyleDefinition } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import type { LowerPlotsOptions } from '@retikz/plot';

import type { InputChartPresentation } from '../../normalize/chart';
import type { InputChartPanel } from '../../shared';

/** Point family 各 concrete chartType 共用的 Vanilla 输入字段 */
export type TypedChartCommonInput<TSource extends IRChartSource> = InputChartPresentation &
  Readonly<{
    /** 具体类型解析方案使用的数据行 */
    data: Array<ExternalRow>;
    /** 稳定的数据引用；省略时固定为 `chart.data` */
    dataRef?: string;
    /** 可选的 Plot 数据模型 */
    dataModel?: TSource['data']['model'];
    /** Chart 外层尺寸 */
    layout?: TSource['layout'];
    /** Chart Source 身份 */
    id?: string;
    /** Source-owned named / inline Chart Theme；Core host Theme 仍可使用同名字段的 Core 形态 */
    theme?: TSource['theme'] | IRScene['theme'];
    /** 当前编译边界可见的命名 Chart Theme Definition */
    themeDefinitions?: ReadonlyArray<ChartThemeDefinition>;
    /** Plot lowering 的运行时选项 */
    lowerOptions?: LowerPlotsOptions;
    /** Chart Source 外层宿主 Scope */
    panel?: InputChartPanel;
    /** Core host Theme definitions */
    themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
    /** 显式 Plot-owned fragment */
    plotExtension?: TSource['plotExtension'];
  }>;

/** 从精确 Chart Source 推导对应的 plain normalizer 输入 */
export type InputTypedChart<TSource extends { data: object; recipe: object }> = InputChartPresentation &
  Omit<TSource, 'namespace' | 'type' | 'presentation' | 'recipe'> &
  Omit<TSource['recipe'], 'chartType'>;
