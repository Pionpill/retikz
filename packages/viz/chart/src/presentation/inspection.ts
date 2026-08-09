import type { z } from 'zod';

import { z as zod } from 'zod';

import {
  CHART_PRESENTATION_RESOLVED_PLOT_SOURCE_PATH,
  ChartPresentationDefaultItemKey,
  ChartPresentationItemContentKind,
  ChartPresentationPreset,
  ChartPresentationResolvedContentKind,
} from './constants';

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
      .describe('Whether resolved Chart content is a bare Plot or a Layout FlexLayout'),
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
