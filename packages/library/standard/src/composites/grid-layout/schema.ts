import { z } from 'zod';

import {
  LayoutAlignment,
  LayoutAlignmentSchema,
  LayoutContainerBoxSchema,
  LayoutDistribution,
  LayoutDistributionSchema,
  LayoutEdgeAlignmentSchema,
  LayoutItemBaseSchema,
  LayoutItemKind,
} from '../shared/layout';
import { GRID_LAYOUT_MAX_TRACKS_PER_AXIS, GridAutoFlow, GridOverlap } from './constants';

const GridFixedTrackBreadthSchema = z
  .strictObject({
    kind: z.literal('fixed').describe('Discriminator for a fixed grid track breadth.'),
    value: z.number().nonnegative().describe('Finite authored fixed track breadth.'),
  })
  .describe('Fixed GridLayout track breadth.');

const GridContentTrackBreadthSchema = z
  .strictObject({
    kind: z.literal('content').describe('Discriminator for an intrinsic grid track breadth.'),
    mode: z.enum(['minimum', 'natural']).describe('Intrinsic contribution profile used by this breadth.'),
  })
  .describe('Intrinsic GridLayout track breadth.');

const GridFractionTrackBreadthSchema = z
  .strictObject({
    kind: z.literal('fraction').describe('Discriminator for a fractional grid track breadth.'),
    factor: z.number().positive().describe('Finite positive share of remaining finite axis space.'),
  })
  .describe('Fractional GridLayout track breadth.');

export const GridTrackBreadthSchema = z
  .discriminatedUnion('kind', [
    GridFixedTrackBreadthSchema,
    GridContentTrackBreadthSchema,
    GridFractionTrackBreadthSchema,
  ])
  .describe('Closed GridLayout track breadth union.');

const GridTrackMinimumSchema = z.discriminatedUnion('kind', [
  GridFixedTrackBreadthSchema,
  GridContentTrackBreadthSchema,
]);

const GridMinmaxTrackSchema = z
  .strictObject({
    kind: z.literal('minmax').describe('Discriminator for bounded GridLayout track sizing.'),
    min: GridTrackMinimumSchema.describe('Non-fraction lower breadth.'),
    max: GridTrackBreadthSchema.describe('Upper or fractional growth breadth.'),
  })
  .superRefine((track, context) => {
    if (track.min.kind === 'fixed' && track.max.kind === 'fixed' && track.max.value < track.min.value) {
      context.addIssue({ code: 'custom', path: ['max', 'value'], message: 'Fixed max must be at least fixed min.' });
    }
  })
  .describe('Canonical minmax GridLayout track.');

export const GridTrackSchema = z
  .union([GridTrackBreadthSchema, GridMinmaxTrackSchema])
  .describe('Canonical GridLayout track definition.');

export const GridPlacementSchema = z
  .strictObject({
    start: z.number().int().safe().nonnegative().optional().describe('Optional zero-based explicit track start.'),
    span: z
      .number()
      .int()
      .safe()
      .positive()
      .max(GRID_LAYOUT_MAX_TRACKS_PER_AXIS)
      .default(1)
      .describe('Positive explicit or auto track span within the track guard.'),
  })
  .describe('Canonical zero-based GridLayout axis placement.');

export const GridLayoutItemSchema = LayoutItemBaseSchema.extend({
  kind: z.literal(LayoutItemKind.Grid).describe('Discriminator for an item owned by GridLayout.'),
  column: GridPlacementSchema.optional().describe('Optional explicit column placement.'),
  row: GridPlacementSchema.optional().describe('Optional explicit row placement.'),
  justifySelf: LayoutEdgeAlignmentSchema.optional().describe('Optional horizontal alignment within the grid area.'),
  alignSelf: LayoutAlignmentSchema.optional().describe('Optional vertical alignment within the grid area.'),
}).describe('Canonical JSON-safe item owned by GridLayout.');

const ImplicitTrackDefault = Object.freeze({ kind: 'content' as const, mode: 'natural' as const });

const GridLayoutBaseSchema = LayoutContainerBoxSchema.extend({
  namespace: z.literal('standard').describe('Composite namespace for Standard drawing capabilities.'),
  type: z.literal('gridLayout').describe('Composite type for deterministic two-dimensional track layout.'),
  columns: z
    .array(GridTrackSchema)
    .min(1)
    .max(GRID_LAYOUT_MAX_TRACKS_PER_AXIS)
    .describe('Explicit physical column tracks.'),
  rows: z
    .array(GridTrackSchema)
    .max(GRID_LAYOUT_MAX_TRACKS_PER_AXIS)
    .default([])
    .describe('Explicit physical row tracks.'),
  implicitColumn: GridTrackSchema.default(ImplicitTrackDefault).describe('Track definition for implicit columns.'),
  implicitRow: GridTrackSchema.default(ImplicitTrackDefault).describe('Track definition for implicit rows.'),
  autoFlow: z.enum(GridAutoFlow).default(GridAutoFlow.Row).describe('Non-dense fully-auto placement flow.'),
  overlap: z.enum(GridOverlap).default(GridOverlap.Reject).describe('Policy for fully explicit authored overlap.'),
  columnGap: z.number().nonnegative().default(0).describe('Physical horizontal gap between column tracks.'),
  rowGap: z.number().nonnegative().default(0).describe('Physical vertical gap between row tracks.'),
  justifyItems: LayoutEdgeAlignmentSchema.default(LayoutAlignment.Stretch).describe(
    'Default horizontal item alignment.',
  ),
  alignItems: LayoutAlignmentSchema.default(LayoutAlignment.Stretch).describe('Default vertical item alignment.'),
  justifyContent: LayoutDistributionSchema.default(LayoutDistribution.Start).describe(
    'Horizontal distribution of the resolved column group.',
  ),
  alignContent: LayoutDistributionSchema.default(LayoutDistribution.Start).describe(
    'Vertical distribution of the resolved row group.',
  ),
  children: z.array(GridLayoutItemSchema).default([]).describe('Authored grid items in stable paint order.'),
});

type GridLayoutRefinementInput = z.infer<typeof GridLayoutBaseSchema>;

/** 校验 GridLayout 的本地 identity 与显式 placement guard */
const refineGridLayout = (layout: GridLayoutRefinementInput, context: z.RefinementCtx): void => {
  const seen = new Set<string>();
  layout.children.forEach((item, index) => {
    if (seen.has(item.key)) {
      context.addIssue({
        code: 'custom',
        path: ['children', index, 'key'],
        message: `Duplicate GridLayout item key '${item.key}'.`,
      });
    }
    seen.add(item.key);
    for (const axis of ['column', 'row'] as const) {
      const placement = item[axis];
      if (placement?.start !== undefined && placement.start > GRID_LAYOUT_MAX_TRACKS_PER_AXIS - placement.span) {
        context.addIssue({
          code: 'custom',
          path: ['children', index, axis, 'start'],
          message: `${axis} start and span exceed the GridLayout track guard.`,
        });
      }
    }
  });
};

export const GridLayoutSchema = GridLayoutBaseSchema.superRefine(refineGridLayout).describe(
  'Canonical JSON-safe Standard GridLayout composite.',
);
