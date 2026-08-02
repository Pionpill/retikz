import { z } from 'zod';

import {
  LayoutArtifactContainerSchema,
  LayoutArtifactItemBaseSchema,
  LayoutArtifactRectSchema,
} from '../shared/layout';
import { LegendContentKind } from './constants';

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
    sourceIndex: z.number().int().safe().nonnegative().describe('Zero-based authored item order.'),
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
    sourceIndex: z.number().int().safe().nonnegative().describe('Zero-based authored tick order.'),
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
