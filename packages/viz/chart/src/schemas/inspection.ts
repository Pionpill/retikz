import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import { JsonObjectSchema } from '@retikz/core';
import { z as zod } from 'zod';

/** Chart member 的 contribution 来源 */
export const ChartContributionSource = {
  TypeDefault: 'type-default',
  UserOverride: 'user-override',
  PlotExtension: 'plot-extension',
} as const;

/** Chart contribution 来源取值 */
export type ChartContributionSourceValue = ValueOf<typeof ChartContributionSource>;

/** Chart inspection member 的 Plot collection 分类 */
export const ChartInspectionMemberKind = {
  Transform: 'transform',
  Scale: 'scale',
  Coordinate: 'coordinate',
  Composition: 'composition',
  Mark: 'mark',
  Guide: 'guide',
} as const;

/** Chart inspection member 分类取值 */
export type ChartInspectionMemberKindValue = ValueOf<typeof ChartInspectionMemberKind>;

const ChartContributionSourceSchema = zod
  .strictObject({
    kind: zod.enum(ChartContributionSource).describe('Contribution source classification'),
    path: zod.string().min(1).describe('Stable owner-qualified source path'),
  })
  .describe('Source contribution applied to one resolved Chart member');

/** Chart resolution 中一个最终 Plot member 的 inspection 契约 */
export const ChartInspectionMemberSchema = zod
  .strictObject({
    target: zod.string().min(1).describe('Stable semantic target for this final Plot member'),
    kind: zod.enum(ChartInspectionMemberKind).describe('Final Plot member collection kind'),
    id: zod.string().min(1).optional().describe('Optional Plot member id'),
    core: zod.boolean().describe('Whether the Chart recipe requires this member'),
    value: JsonObjectSchema.describe('Normalized final Plot member value'),
    sources: zod.array(ChartContributionSourceSchema).describe('Ordered contributions applied to this member'),
  })
  .describe('Normalized final Plot member and its ordered Chart contributions');

/** Chart inspection member 的 JSON-safe 类型 */
export type IRChartInspectionMember = z.infer<typeof ChartInspectionMemberSchema>;

/** Chart resolution 的只读 inspection 契约 */
export const ChartInspectionSchema = zod
  .strictObject({
    chart: zod
      .strictObject({
        type: zod.string().min(1).describe('Resolved Chart variant type'),
        id: zod.string().min(1).optional().describe('Optional Chart identity'),
      })
      .describe('Resolved Chart identity'),
    plot: zod
      .strictObject({
        id: zod.string().min(1).optional().describe('Optional resolved Plot identity'),
      })
      .describe('Resolved Plot identity'),
    members: zod.array(ChartInspectionMemberSchema).describe('Final Plot members in normalized collection order'),
  })
  .describe('Read-only inspection of one resolved Chart and its final Plot members');

/** Chart resolution inspection 的 JSON-safe 类型 */
export type IRChartInspection = z.infer<typeof ChartInspectionSchema>;
