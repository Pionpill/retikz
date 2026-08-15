import type { ValueOf } from '@retikz/foundation';

/** Chart member 的 Plot collection 分类 */
export const ChartMemberKind = {
  Transform: 'transform',
  Scale: 'scale',
  Coordinate: 'coordinate',
  Composition: 'composition',
  Mark: 'mark',
  Guide: 'guide',
} as const;

/** Chart member 分类取值 */
export type ChartMemberKindValue = ValueOf<typeof ChartMemberKind>;
