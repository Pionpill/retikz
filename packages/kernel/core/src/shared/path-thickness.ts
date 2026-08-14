import type { AssertEqual, ValueOf } from '@retikz/foundation';

/** 路径语义线宽关键字 */
export const PathThickness = {
  /** 比 thin 更细的极细线 */
  UltraThin: 'ultraThin',
  /** 很细的线宽 */
  VeryThin: 'veryThin',
  /** 默认细线宽 */
  Thin: 'thin',
  /** 介于 thin 与 thick 之间的半粗线 */
  Semithick: 'semithick',
  /** 粗线宽 */
  Thick: 'thick',
  /** 很粗的线宽 */
  VeryThick: 'veryThick',
  /** 比 veryThick 更粗的极粗线 */
  UltraThick: 'ultraThick',
} as const;

/** 路径语义线宽关键字取值 */
export type PathThicknessValue = ValueOf<typeof PathThickness>;

/** 语义线宽关键字到数值 strokeWidth 的确定性映射 */
export const THICKNESS_TO_WIDTH = {
  ultraThin: 0.25,
  veryThin: 0.5,
  thin: 1,
  semithick: 1.5,
  thick: 2,
  veryThick: 3,
  ultraThick: 4,
} as const satisfies Record<PathThicknessValue, number>;

/** 确保每个语义线宽关键字都有对应数值 */
type ThicknessCheck = AssertEqual<keyof typeof THICKNESS_TO_WIDTH, PathThicknessValue>;
const thicknessCheck: ThicknessCheck = true;
void thicknessCheck;
