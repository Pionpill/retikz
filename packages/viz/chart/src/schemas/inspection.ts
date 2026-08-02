import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import { JsonObjectSchema } from '@retikz/core';
import { z as zod } from 'zod';

import {
  CHART_PRESENTATION_RESOLVED_PLOT_SOURCE_PATH,
  ChartPresentationDefaultItemKey,
  ChartPresentationItemContentKind,
  ChartPresentationPreset,
  ChartPresentationResolvedContentKind,
} from './presentation';
import { ChartResolvedStyleTokensSchema, ChartStyle, ChartStyleToken, ChartThemeMode } from './style';

/** Chart member 的 contribution 来源 */
export const ChartContributionSource = {
  TypeDefault: 'type-default',
  UserOverride: 'user-override',
  PlotExtension: 'plot-extension',
} as const;

/** Chart contribution 来源取值 */
export type ChartContributionSourceValue = ValueOf<typeof ChartContributionSource>;

/** Chart style token 的最终来源层 */
export const ChartStyleTokenSource = {
  /** 内建 preset 与 mode */
  Preset: 'preset',
  /** 用户稀疏 token 覆盖 */
  StyleToken: 'style-token',
} as const;

/** Chart style token 最终来源层取值 */
export type ChartStyleTokenSourceValue = ValueOf<typeof ChartStyleTokenSource>;

/** Chart style 之后继续参与 Plot theme cascade 的用户入口 */
export const ChartStyleAuthoredOverride = {
  /** Plot colors 简写 */
  Colors: 'colors',
  /** 原生 Plot theme */
  Theme: 'theme',
} as const;

/** Chart style 后续用户覆盖入口取值 */
export type ChartStyleAuthoredOverrideValue = ValueOf<typeof ChartStyleAuthoredOverride>;

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

const ChartPresentationPlotItemInspectionSchema = zod
  .strictObject({
    key: zod.literal(ChartPresentationDefaultItemKey.Plot).describe('Stable Chart-local Plot item identity'),
    contentKind: zod
      .literal(ChartPresentationItemContentKind.Plot)
      .describe('Discriminator for the resolved Plot item'),
    sourcePath: zod.string().min(1).describe('Stable authored or resolved source path for the Plot item'),
  })
  .describe('Inspection projection for the single Chart Plot item');

const ChartPresentationPresetItemInspectionSchema = zod
  .strictObject({
    key: zod.string().min(1).describe('Resolved container-local text preset item identity'),
    contentKind: zod
      .literal(ChartPresentationItemContentKind.Preset)
      .describe('Discriminator for a Chart text preset item'),
    preset: zod.enum(ChartPresentationPreset).describe('Text preset authored for this item'),
    sourcePath: zod.string().min(1).describe('Stable authored source path for this preset item'),
  })
  .describe('Inspection projection for one authored Chart text preset item');

const ChartPresentationChildItemInspectionSchema = zod
  .strictObject({
    key: zod.string().min(1).describe('Resolved container-local custom child item identity'),
    contentKind: zod
      .literal(ChartPresentationItemContentKind.Child)
      .describe('Discriminator for an arbitrary custom child item'),
    sourcePath: zod.string().min(1).describe('Stable authored source path for this custom child item'),
  })
  .describe('Inspection projection for one authored custom child item');

/** Chart presentation inspection 的 authored-order item record */
export const ChartPresentationItemInspectionSchema = zod
  .discriminatedUnion('contentKind', [
    ChartPresentationPlotItemInspectionSchema,
    ChartPresentationPresetItemInspectionSchema,
    ChartPresentationChildItemInspectionSchema,
  ])
  .describe('Stable identity and authored source of one resolved Chart presentation item');

/** Chart presentation inspection 的 item record */
export type IRChartPresentationItemInspection = z.infer<typeof ChartPresentationItemInspectionSchema>;

/** Chart resolution 的 presentation content inspection */
export const ChartPresentationInspectionSchema = zod
  .strictObject({
    contentKind: zod
      .enum(ChartPresentationResolvedContentKind)
      .describe('Whether resolved Chart content is a bare Plot or a Standard FlexLayout'),
    items: zod
      .array(ChartPresentationItemInspectionSchema)
      .min(1)
      .describe('Resolved presentation items in authored order'),
  })
  .superRefine((presentation, ctx) => {
    const keys = new Set<string>();
    presentation.items.forEach((item, index) => {
      if (keys.has(item.key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'key'],
          message: `Duplicate Chart presentation item key '${item.key}'`,
        });
      }
      keys.add(item.key);
    });
    const plotIndexes = presentation.items.flatMap((item, index) =>
      item.contentKind === ChartPresentationItemContentKind.Plot ? [index] : [],
    );
    if (plotIndexes.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'Chart presentation inspection requires exactly one Plot item',
      });
    } else if (plotIndexes.length > 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['items', plotIndexes[1], 'contentKind'],
        message: 'Chart presentation inspection allows exactly one Plot item',
      });
    }
    if (presentation.contentKind === ChartPresentationResolvedContentKind.Plot) {
      const item = presentation.items[0];
      if (
        presentation.items.length !== 1 ||
        item.contentKind !== ChartPresentationItemContentKind.Plot ||
        item.sourcePath !== CHART_PRESENTATION_RESOLVED_PLOT_SOURCE_PATH
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['items'],
          message: 'Bare Chart Plot inspection must contain only the resolved Plot item',
        });
      }
    }
  })
  .describe('Resolved Chart presentation content kind and authored-order item identities without leaf provenance');

/** Chart presentation inspection 的 JSON-safe 类型 */
export type IRChartPresentationInspection = z.infer<typeof ChartPresentationInspectionSchema>;

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
