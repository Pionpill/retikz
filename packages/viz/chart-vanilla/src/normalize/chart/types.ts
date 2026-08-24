import type { IRTextBlock } from '@retikz/core';
import type { IRPlotFacetConfiguration } from '@retikz/plot';

/** Chart presentation 的四个固定槽位 shorthand */
export type InputChartPresentation = Readonly<{
  /** Chart 标题 */
  title?: IRTextBlock;
  /** Chart 副标题 */
  subtitle?: IRTextBlock;
  /** Chart 注记 */
  note?: IRTextBlock;
  /** Chart 数据来源 */
  source?: IRTextBlock;
}>;

/** Chart facet 的字段简写或完整 Plot-owned 配置 */
export type InputChartFacet = Omit<IRPlotFacetConfiguration, 'row' | 'column'> &
  Readonly<{
    /** 行方向分面字段或完整维度配置 */
    row?: string | NonNullable<IRPlotFacetConfiguration['row']>;
    /** 列方向分面字段或完整维度配置 */
    column?: string | NonNullable<IRPlotFacetConfiguration['column']>;
  }>;
