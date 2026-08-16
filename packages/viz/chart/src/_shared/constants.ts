import type { ValueOf } from '@retikz/foundation';

/** Chart 顶层实体的命名空间 */
export const CHART_NAMESPACE = 'chart' as const;

/** Chart 基础类型 */
export const BaseChartType = {
  /** 基础类型，直接承载完整 Plot，不补充类型专属结构 */
  Base: 'base',
} as const;

/** Base Chart 类型取值 */
export type BaseChartTypeValue = ValueOf<typeof BaseChartType>;
