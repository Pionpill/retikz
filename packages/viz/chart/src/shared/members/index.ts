import type { IRJsonObject } from '@retikz/core';
import type { ValueOf } from '@retikz/foundation';

/** Chart member 的 contribution 来源 */
export const ChartContributionSource = {
  TypeDefault: 'type-default',
  UserOverride: 'user-override',
  PlotExtension: 'plot-extension',
} as const;

/** Chart member contribution 来源取值 */
export type ChartContributionSourceValue = ValueOf<typeof ChartContributionSource>;

/** Chart member 的 Plot collection 分类 */
export const ChartInspectionMemberKind = {
  Transform: 'transform',
  Scale: 'scale',
  Coordinate: 'coordinate',
  Composition: 'composition',
  Mark: 'mark',
  Guide: 'guide',
} as const;

/** Chart member 分类取值 */
export type ChartInspectionMemberKindValue = ValueOf<typeof ChartInspectionMemberKind>;

/** 一个 Chart member 的可追溯来源 */
export type ChartContributionSourceRecord = {
  kind: ChartContributionSourceValue;
  path: string;
};

/** 交给 inspection 的中立最终 member record */
export type ChartInspectionMemberInput = {
  target: string;
  kind: ChartInspectionMemberKindValue;
  core: boolean;
  plotPath: ReadonlyArray<string | number>;
  value: IRJsonObject;
  sources: Array<ChartContributionSourceRecord>;
};
