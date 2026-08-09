import type { IRJsonObject } from '@retikz/core';
import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import { JsonObjectSchema, ThemeMode, ThemeTokenSource } from '@retikz/core';
import { PlotThemeResolutionSchema } from '@retikz/plot';
import { z as zod } from 'zod';

import { ChartPresentationInspectionSchema } from '../presentation';
import { ChartResolvedThemeTokensSchema, ChartThemeToken } from '../style';

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

/** Chart resolution inspection member 的 JSON-safe 类型 */
export type IRChartInspectionMember = z.infer<typeof ChartInspectionMemberSchema>;

/** 交给 inspection 的中立最终 member record */
export type ChartInspectionMemberInput = {
  target: string;
  kind: IRChartInspectionMember['kind'];
  core: boolean;
  plotPath: ReadonlyArray<string | number>;
  value: IRJsonObject;
  sources: IRChartInspectionMember['sources'];
};

const ChartThemeTokenSourceSchema = zod
  .strictObject({
    token: zod.enum(ChartThemeToken).describe('Canonical Chart style token'),
    kind: zod.enum(ThemeTokenSource).describe('Winning Chart token source relation to the Chart owner'),
    path: zod.string().min(1).describe('Stable source path for this resolved Chart token'),
  })
  .describe('Winning cascade source for one resolved Chart style token');

const ChartOwnedStyleInspectionSchema = zod
  .strictObject({
    style: zod.string().min(1).describe('Effective Theme style selecting the Chart style definition'),
    mode: zod.enum(ThemeMode).describe('Effective Theme mode selecting Chart paints'),
    tokens: ChartResolvedThemeTokensSchema.describe('Complete resolved Chart-owned token map'),
    tokenSources: zod
      .array(ChartThemeTokenSourceSchema)
      .describe('One winning source for each Chart token in canonical order'),
  })
  .superRefine((style, context) => {
    const canonical = Object.values(ChartThemeToken);
    if (
      style.tokenSources.length !== canonical.length ||
      style.tokenSources.some((source, index) => source.token !== canonical[index])
    ) {
      context.addIssue({
        code: 'custom',
        path: ['tokenSources'],
        message: 'Chart token sources must contain every canonical token exactly once and in order',
      });
    }
    style.tokenSources.forEach((source, index) => {
      const valid =
        source.kind === ThemeTokenSource.Local &&
        (source.path === `$style/${style.style}/${style.mode}/${source.token}` ||
          source.path === `$spec/chartThemeTokens/${source.token}`);
      if (!valid) {
        context.addIssue({
          code: 'custom',
          path: ['tokenSources', index, 'path'],
          message: 'Chart token source relation and path must identify the canonical owner-local input',
        });
      }
    });
  })
  .describe('Resolved Chart-owned presentation and recipe style');

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
    style: zod
      .strictObject({
        chart: ChartOwnedStyleInspectionSchema.describe('Chart-owned token resolution'),
        plot: PlotThemeResolutionSchema.describe('Plot-owned token and native theme resolution'),
      })
      .describe('Owner-preserving Chart and Plot style inspection'),
    presentation: ChartPresentationInspectionSchema.describe('Resolved presentation content and item identities'),
    members: zod.array(ChartInspectionMemberSchema).describe('Final Plot members in normalized collection order'),
  })
  .describe('Read-only inspection of one resolved Chart and its final Plot members');

/** Chart resolution inspection 的 JSON-safe 类型 */
export type IRChartInspection = z.infer<typeof ChartInspectionSchema>;
