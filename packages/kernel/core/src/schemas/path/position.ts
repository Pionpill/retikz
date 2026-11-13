import type { ValueOf } from '@retikz/foundation';
import { enum as zodEnum } from 'zod';

/** 路径定位比例的解释方式 */
export const PathPositionMode = {
  /** 按有效绘制段分配参数区间 */
  Step: 'step',
  /** 按所选路径的累计长度定位 */
  Length: 'length',
} as const;

export type PathPositionMode = ValueOf<typeof PathPositionMode>;

/** 路径定位使用的圆角前后几何 */
export const PathPositionGeometry = {
  /** 圆角前的原始步骤几何 */
  Original: 'original',
  /** 圆角处理后的路径几何 */
  Rounded: 'rounded',
} as const;

export type PathPositionGeometry = ValueOf<typeof PathPositionGeometry>;

/** 路径比例解释的共享值域 */
export const PathPositionModeSchema = zodEnum(PathPositionMode).describe(
  'Interpret normalized position by drawable step segments or cumulative path length.',
);

/** 定位几何的共享值域，不改变原生曲线形状 */
export const PathPositionGeometrySchema = zodEnum(PathPositionGeometry).describe(
  'Use geometry before or after corner rounding; native curves remain curves in both modes.',
);
