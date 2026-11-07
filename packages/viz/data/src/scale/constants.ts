import type { ValueOf } from '@retikz/foundation';

/** 内置通用映射类型 */
export const BuiltinDataScale = {
  Linear: 'linear',
  Log: 'log',
  Pow: 'pow',
  Sqrt: 'sqrt',
  Symlog: 'symlog',
  Radial: 'radial',
  Time: 'time',
  Band: 'band',
  Point: 'point',
  Ordinal: 'ordinal',
  Quantize: 'quantize',
  Quantile: 'quantile',
  Threshold: 'threshold',
  Sequential: 'sequential',
  Diverging: 'diverging',
} as const;

export type BuiltinDataScale = ValueOf<typeof BuiltinDataScale>;
