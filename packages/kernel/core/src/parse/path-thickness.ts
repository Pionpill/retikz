import type { AssertEqual, ValueOf } from '@retikz/foundation';

import { z } from 'zod';

/** 路径语义线宽糖关键字 */
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

/** 路径语义线宽糖取值 */
export type PathThicknessValue = ValueOf<typeof PathThickness>;

/** 路径语义线宽糖 schema，供 adapter / parser 层校验用户输入 */
export const PathThicknessSchema = z.enum(PathThickness).describe('Semantic path stroke thickness preset sugar.');

/** 语义线宽糖到数值 `strokeWidth` 的映射表 */
export const THICKNESS_TO_WIDTH = {
  ultraThin: 0.25,
  veryThin: 0.5,
  thin: 1,
  semithick: 1.5,
  thick: 2,
  veryThick: 3,
  ultraThick: 4,
} as const satisfies Record<PathThicknessValue, number>;

/** 类型互锁：每个语义线宽糖关键字都必须有对应数值 */
type _ThicknessCheck = AssertEqual<keyof typeof THICKNESS_TO_WIDTH, PathThicknessValue>;
const _assertThicknessCheck: _ThicknessCheck = true;
void _assertThicknessCheck;

/** 路径线宽糖解析输入 */
export type PathThicknessSugarInput = {
  /** 已解析的数值线宽；显式给定时优先 */
  strokeWidth?: number;
  /** 语义线宽糖 */
  thickness?: PathThicknessValue;
};

/**
 * 将路径语义线宽糖解析为 IR 片段。
 *
 * @description 显式 `strokeWidth` 优先；只给 `thickness` 时返回等价数值线宽；两者都缺省时不写出字段，让 compile 使用默认线宽
 */
export const parsePathThickness = (input: PathThicknessSugarInput): { strokeWidth?: number } => {
  if (input.strokeWidth !== undefined) return { strokeWidth: input.strokeWidth };
  if (input.thickness !== undefined) return { strokeWidth: THICKNESS_TO_WIDTH[input.thickness] };
  return {};
};
