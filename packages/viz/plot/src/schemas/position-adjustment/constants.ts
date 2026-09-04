import type { ValueOf } from '@retikz/foundation';

/** 内置位置调整类型 */
export const PlotPositionAdjustment = {
  /** 在 position scale 输出空间内执行确定性抖动 */
  Jitter: 'jitter',
} as const;

/** 内置位置调整类型值 */
export type PlotPositionAdjustmentValue = ValueOf<typeof PlotPositionAdjustment>;

/** 内置位置调整判别集合 */
export const BUILTIN_POSITION_ADJUSTMENT_KINDS: ReadonlySet<string> = new Set(Object.values(PlotPositionAdjustment));
