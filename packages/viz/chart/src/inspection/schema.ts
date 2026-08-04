import type { IRJsonObject, ValueOf } from '@retikz/core';
import type { z } from 'zod';

import { JsonObjectSchema } from '@retikz/core';
import { z as zod } from 'zod';

import { ChartPresentationInspectionSchema } from '../presentation';
import {
  ChartResolvedStyleTokensSchema,
  ChartStyle,
  ChartStyleAuthoredOverride,
  ChartStyleToken,
  ChartStyleTokenSource,
  ChartThemeMode,
} from '../style';

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

/** 交给 inspection 的中立最终 member record，不暴露 resolver 私有类型 */
export type ChartInspectionMemberInput = {
  target: string;
  kind: IRChartInspectionMember['kind'];
  core: boolean;
  plotPath: ReadonlyArray<string | number>;
  value: IRJsonObject;
  sources: IRChartInspectionMember['sources'];
};

const ChartStyleTokenSourceSchema = zod
  .strictObject({
    token: zod.enum(ChartStyleToken).describe('Canonical Chart style token'),
    kind: zod.enum(ChartStyleTokenSource).describe('Winning token source layer'),
    path: zod.string().min(1).describe('Stable source path for this resolved token'),
  })
  .describe('Winning cascade source for one resolved Chart style token');

const ChartStyleAuthoredOverrideSchema = zod
  .strictObject({
    kind: zod.enum(ChartStyleAuthoredOverride).describe('Authored Plot style override entry'),
    path: zod.string().min(1).describe('Stable Chart input path'),
  })
  .describe('Authored Plot override applied after the resolved Chart token map');

const ChartInspectionStyleSchema = zod
  .strictObject({
    preset: zod.enum(ChartStyle).describe('Applied built-in Chart style preset'),
    mode: zod.enum(ChartThemeMode).describe('Applied Chart theme mode'),
    tokens: ChartResolvedStyleTokensSchema.describe('Complete resolved Chart style token map'),
    tokenSources: zod
      .array(ChartStyleTokenSourceSchema)
      .describe('One winning source for each token in canonical order'),
    authoredOverrides: zod
      .array(ChartStyleAuthoredOverrideSchema)
      .describe('Authored colors and raw Plot theme override inputs in cascade order'),
  })
  .superRefine((style, ctx) => {
    const canonical = Object.values(ChartStyleToken);
    if (
      style.tokenSources.length !== canonical.length ||
      style.tokenSources.some((source, index) => source.token !== canonical[index])
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['tokenSources'],
        message: 'Chart style token sources must contain every canonical token exactly once and in order',
      });
    }
    const authoredKinds = style.authoredOverrides.map(source => source.kind);
    const expectedKinds = Object.values(ChartStyleAuthoredOverride).filter(kind => authoredKinds.includes(kind));
    if (
      authoredKinds.length !== expectedKinds.length ||
      authoredKinds.some((kind, index) => kind !== expectedKinds[index])
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['authoredOverrides'],
        message: 'Chart style authored overrides must be unique and ordered as colors then theme',
      });
    }
  })
  .describe('Resolved Chart style and stable cascade provenance');

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
    style: ChartInspectionStyleSchema.describe('Resolved visual-language state'),
    presentation: ChartPresentationInspectionSchema.describe('Resolved presentation content and item identities'),
    members: zod.array(ChartInspectionMemberSchema).describe('Final Plot members in normalized collection order'),
  })
  .describe('Read-only inspection of one resolved Chart and its final Plot members');

/** Chart resolution inspection 的 JSON-safe 类型 */
export type IRChartInspection = z.infer<typeof ChartInspectionSchema>;
