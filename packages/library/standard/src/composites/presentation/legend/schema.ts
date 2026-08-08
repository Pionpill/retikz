import { ChildSchema, CompositeBaseSchema, ScopePropsSchema } from '@retikz/core';
import { z } from 'zod';

import {
  LayoutAlignment,
  LayoutArtifactContainerSchema,
  LayoutArtifactItemBaseSchema,
  LayoutArtifactRectSchema,
  LayoutContainerBoxSchema,
  LayoutGapSchema,
} from '../../layout/shared';
import { STANDARD_NAMESPACE } from '../../shared';
import { LegendContentKind, LegendDirection, LegendSampleAlignment, LegendWrap } from './constants';

const LegendGapSchema = z
  .union([
    LayoutGapSchema.describe('Uniform physical gap applied to both rows and columns.'),
    z
      .strictObject({
        row: LayoutGapSchema.describe('Physical vertical gap between adjacent rows.'),
        column: LayoutGapSchema.describe('Physical horizontal gap between adjacent columns.'),
      })
      .describe('Independent physical row and column gaps.'),
  ])
  .transform(gap => (typeof gap === 'number' ? { row: gap, column: gap } : gap))
  .default({ row: 8, column: 8 })
  .describe('Physical gaps between adjacent rows and columns; a number applies uniformly to both axes.');

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
    gap: LegendGapSchema,
    sampleGap: LayoutGapSchema.default(8).describe('Horizontal gap between an item sample and its label.'),
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
    sampleGap: LayoutGapSchema.default(8).describe('Physical gap from the sample to the optional tick-label region.'),
    ticks: z.array(LegendTickSchema).describe('Normalized ticks in stable non-decreasing authored order.'),
  })
  .describe('Canonical continuous-ramp content for a Standard Legend.');

const LegendContentSchema = z
  .discriminatedUnion('kind', [LegendItemsContentSchema, LegendRampContentSchema])
  .describe('Structured discrete or continuous content of a Standard Legend.');

const LegendBaseSchema = CompositeBaseSchema.extend({
  namespace: z.literal(STANDARD_NAMESPACE).describe('Composite namespace for Standard drawing capabilities.'),
  type: z.literal('legend').describe('Composite type for an already-resolved visual legend.'),
  ...ScopePropsSchema.shape,
  title: ChildSchema.optional().describe('Optional JSON-safe Core child displayed above the legend body.'),
  titleGap: LayoutGapSchema.default(8).describe(
    'Vertical gap used only when both the title and a non-empty body are present.',
  ),
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

/** 参与 authored identity 校验的 Legend artifact 条目 */
type LegendAuthoredArtifactEntry = {
  key: string;
  sourceIndex: number;
};

/** 校验 Legend artifact 条目的 authored identity 与连续顺序 */
const refineLegendAuthoredArtifactEntries = (
  entries: Array<LegendAuthoredArtifactEntry>,
  path: 'items' | 'ticks',
  context: z.RefinementCtx,
) => {
  const keys = new Set<string>();
  entries.forEach((entry, index) => {
    if (entry.sourceIndex !== index) {
      context.addIssue({
        code: 'custom',
        path: [path, index, 'sourceIndex'],
        message: 'sourceIndex must match the authored array order.',
      });
    }
    if (keys.has(entry.key)) {
      context.addIssue({
        code: 'custom',
        path: [path, index, 'key'],
        message: `Duplicate ${path === 'items' ? 'item' : 'tick'} key '${entry.key}'.`,
      });
    }
    keys.add(entry.key);
  });
};

export const LegendArtifactGeometrySchema = z
  .strictObject({
    allocationBounds: LayoutArtifactRectSchema.describe('Union of translated real child allocation bounds.'),
    visualBounds: LayoutArtifactRectSchema.describe('Union of translated conservative child visual bounds.'),
    visibleBounds: LayoutArtifactRectSchema.nullable().describe(
      'Visible visual union under the Legend overflow policy, or null when no positive area remains.',
    ),
  })
  .describe('Observable geometry shared by one Legend presentation region.');

export const LegendPlacedChildArtifactSchema = LayoutArtifactItemBaseSchema.omit({
  key: true,
  sourceIndex: true,
  marginBounds: true,
  alignmentGuide: true,
}).describe('Observable slot, placement, bounds, and overflow for one Legend child.');

const LegendItemArtifactSchema = z
  .strictObject({
    key: z.string().min(1).describe('Stable authored item identity.'),
    sourceIndex: z.number().int().nonnegative().describe('Zero-based authored item order.'),
    geometry: LegendArtifactGeometrySchema.describe('Union geometry of the sample and optional label.'),
    sample: LegendPlacedChildArtifactSchema.describe('Resolved sample placement.'),
    label: LegendPlacedChildArtifactSchema.nullable().describe('Resolved label placement, or null when omitted.'),
  })
  .describe('Resolved identity, geometry, and child placements for one discrete Legend item.');

export const LegendItemsArtifactSchema = z
  .strictObject({
    kind: z.literal(LegendContentKind.Items).describe('Discriminator for a discrete-items Legend artifact.'),
    container: LayoutArtifactContainerSchema.describe('Resolved Legend container geometry.'),
    title: LegendPlacedChildArtifactSchema.nullable().describe('Resolved title placement, or null when omitted.'),
    bodyBounds: LayoutArtifactRectSchema.nullable().describe(
      'Union of placed item allocations and structural gaps, or null when there are no items.',
    ),
    items: z.array(LegendItemArtifactSchema).describe('Discrete item artifacts in stable authored order.'),
  })
  .superRefine((artifact, context) => refineLegendAuthoredArtifactEntries(artifact.items, 'items', context))
  .describe('Typed artifact for a resolved discrete-items Standard Legend.');

const LegendTickArtifactSchema = z
  .strictObject({
    key: z.string().min(1).describe('Stable authored tick identity.'),
    sourceIndex: z.number().int().nonnegative().describe('Zero-based authored tick order.'),
    anchor: z
      .strictObject({
        x: z.number().describe('Finite horizontal anchor in Legend allocation coordinates.'),
        y: z.number().describe('Finite vertical anchor in Legend allocation coordinates.'),
      })
      .describe('Sample-derived physical anchor for this normalized tick.'),
    label: LegendPlacedChildArtifactSchema.nullable().describe('Resolved tick label placement, or null when omitted.'),
  })
  .describe('Resolved identity, anchor, and optional label placement for one continuous Legend tick.');

export const LegendRampArtifactSchema = z
  .strictObject({
    kind: z.literal(LegendContentKind.Ramp).describe('Discriminator for a continuous-ramp Legend artifact.'),
    container: LayoutArtifactContainerSchema.describe('Resolved Legend container geometry.'),
    title: LegendPlacedChildArtifactSchema.nullable().describe('Resolved title placement, or null when omitted.'),
    bodyBounds: LayoutArtifactRectSchema.describe('Union of the final sample and non-empty tick-label allocations.'),
    sample: LegendPlacedChildArtifactSchema.describe('Resolved continuous sample placement.'),
    ticks: z.array(LegendTickArtifactSchema).describe('Tick anchors and labels in stable authored order.'),
  })
  .superRefine((artifact, context) => refineLegendAuthoredArtifactEntries(artifact.ticks, 'ticks', context))
  .describe('Typed artifact for a resolved continuous-ramp Standard Legend.');

export const LegendArtifactSchema = z
  .discriminatedUnion('kind', [LegendItemsArtifactSchema, LegendRampArtifactSchema])
  .describe('Typed artifact for a resolved Standard Legend.');
