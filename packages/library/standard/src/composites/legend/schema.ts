import { ChildSchema, CompositeBaseSchema } from '@retikz/core';
import { z } from 'zod';

import { LayoutAlignment, LayoutContainerBoxSchema } from '../shared/layout';
import { LegendContentKind, LegendDirection, LegendSampleAlignment, LegendWrap } from './constants';

export const LegendItemSchema = z
  .strictObject({
    key: z.string().min(1).describe('Container-local stable identity for this discrete legend item.'),
    sample: ChildSchema.describe('JSON-safe Core child that visually demonstrates the item.'),
    label: ChildSchema.optional().describe('Optional JSON-safe Core child explaining the sample.'),
  })
  .describe('Canonical discrete item in a Standard Legend.');

export const LegendItemsContentSchema = z
  .strictObject({
    kind: z.literal(LegendContentKind.Items).describe('Discriminator for a list of discrete sample-label items.'),
    direction: z
      .enum(LegendDirection)
      .default(LegendDirection.Vertical)
      .describe('Physical main-axis direction used to place items in authored order.'),
    wrap: z
      .enum(LegendWrap)
      .default(LegendWrap.NoWrap)
      .describe('Whether constrained items form additional rows or columns.'),
    columnGap: z.number().nonnegative().default(8).describe('Physical horizontal gap between adjacent regions.'),
    rowGap: z.number().nonnegative().default(8).describe('Physical vertical gap between adjacent regions.'),
    sampleGap: z.number().nonnegative().default(8).describe('Horizontal gap between an item sample and its label.'),
    sampleAlign: z
      .enum(LegendSampleAlignment)
      .default(LegendSampleAlignment.Center)
      .describe('Physical y-axis alignment between each item sample and label.'),
    items: z.array(LegendItemSchema).describe('Discrete legend items in stable authored order.'),
  })
  .describe('Canonical discrete-items content for a Standard Legend.');

export const LegendTickSchema = z
  .strictObject({
    key: z.string().min(1).describe('Container-local stable identity for this continuous legend tick.'),
    offset: z.number().min(0).max(1).describe('Normalized authored position along the sample main axis.'),
    label: ChildSchema.optional().describe('Optional JSON-safe Core child explaining the tick position.'),
  })
  .describe('Canonical normalized tick in a continuous Standard Legend.');

export const LegendRampContentSchema = z
  .strictObject({
    kind: z.literal(LegendContentKind.Ramp).describe('Discriminator for one continuous sample with normalized ticks.'),
    direction: z
      .enum(LegendDirection)
      .default(LegendDirection.Vertical)
      .describe('Physical axis along which normalized tick offsets are resolved.'),
    sample: ChildSchema.describe('JSON-safe Core child that displays the continuous visual sample.'),
    sampleGap: z
      .number()
      .nonnegative()
      .default(8)
      .describe('Physical gap from the sample to the optional tick-label region.'),
    ticks: z.array(LegendTickSchema).describe('Normalized ticks in stable non-decreasing authored order.'),
  })
  .describe('Canonical continuous-ramp content for a Standard Legend.');

const LegendContentSchema = z
  .discriminatedUnion('kind', [LegendItemsContentSchema, LegendRampContentSchema])
  .describe('Structured discrete or continuous content of a Standard Legend.');

const LegendBaseSchema = CompositeBaseSchema.extend({
  namespace: z.literal('standard').describe('Composite namespace for Standard drawing capabilities.'),
  type: z.literal('legend').describe('Composite type for an already-resolved visual legend.'),
  title: ChildSchema.optional().describe('Optional JSON-safe Core child displayed above the legend body.'),
  titleGap: z
    .number()
    .nonnegative()
    .default(8)
    .describe('Vertical gap used only when both the title and a non-empty body are present.'),
  contentAlign: z
    .enum([LayoutAlignment.Start, LayoutAlignment.Center, LayoutAlignment.End])
    .default(LayoutAlignment.Start)
    .describe('Physical x-axis alignment of title and body structural blocks within the Legend content box.'),
  ...LayoutContainerBoxSchema.shape,
  content: LegendContentSchema.describe('Already-resolved discrete or continuous legend presentation.'),
});

type LegendRefinementInput = z.infer<typeof LegendBaseSchema>;

const refineLegendKeys = (
  entries: ReadonlyArray<{ key: string }>,
  pathPrefix: 'items' | 'ticks',
  context: z.RefinementCtx,
): void => {
  const seenKeys = new Set<string>();

  entries.forEach((entry, index) => {
    if (entry.key.trim().length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['content', pathPrefix, index, 'key'],
        message: 'Legend item and tick keys must contain a non-whitespace character.',
      });
    }
    if (seenKeys.has(entry.key)) {
      context.addIssue({
        code: 'custom',
        path: ['content', pathPrefix, index, 'key'],
        message: `Duplicate Legend key '${entry.key}'.`,
      });
    }
    seenKeys.add(entry.key);
  });
};

const refineLegend = (legend: LegendRefinementInput, context: z.RefinementCtx): void => {
  if (legend.content.kind === LegendContentKind.Items) {
    refineLegendKeys(legend.content.items, 'items', context);
    return;
  }

  refineLegendKeys(legend.content.ticks, 'ticks', context);
  legend.content.ticks.forEach((tick, index) => {
    const previous = legend.content.kind === LegendContentKind.Ramp ? legend.content.ticks[index - 1] : undefined;
    if (previous !== undefined && tick.offset < previous.offset) {
      context.addIssue({
        code: 'custom',
        path: ['content', 'ticks', index, 'offset'],
        message: 'Legend tick offsets must be in non-decreasing authored order.',
      });
    }
  });
};

export const LegendSchema = LegendBaseSchema.superRefine(refineLegend).describe(
  'Canonical JSON-safe Standard Legend composite.',
);
