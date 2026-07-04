import { GeometryLabelPosition, TextBlockSchema } from '@retikz/core';
import { z } from 'zod';

import { AxisCardinalSide, GuideTextStyleSchema } from '../guide';
import {
  LayoutAnchor,
  LayoutCollisionStrategy,
  LayoutPlacementKind,
  LayoutPlacementTarget,
  PlotLabelOverflow,
  PlotLabelRole,
  PlotLabelType,
  PlotLayoutMode,
} from './constants';

const NormalizedRatioSchema = z.number().finite().min(0).max(1);

const textBlockHasContent = (value: unknown): boolean => {
  if (typeof value === 'string') return value.length > 0;
  if (!Array.isArray(value)) return false;
  return value.some(line => {
    if (typeof line === 'string') return line.length > 0;
    if (line && typeof line === 'object' && 'text' in line && typeof line.text === 'string') return line.text.length > 0;
    if (line && typeof line === 'object' && 'runs' in line && Array.isArray(line.runs)) {
      return line.runs.some((run: unknown) => {
        if (!run || typeof run !== 'object') return false;
        if ('text' in run && typeof run.text === 'string') return run.text.length > 0;
        if ('tex' in run && typeof run.tex === 'string') return run.tex.length > 0;
        return false;
      });
    }
    return false;
  });
};

const PlotLabelTextSchema = TextBlockSchema.refine(textBlockHasContent, {
  message: 'plot label text must not be empty',
});

export const BoxPaddingSchema = z
  .object({
    top: z.number().nonnegative().optional().describe('Top padding in user units'),
    right: z.number().nonnegative().optional().describe('Right padding in user units'),
    bottom: z.number().nonnegative().optional().describe('Bottom padding in user units'),
    left: z.number().nonnegative().optional().describe('Left padding in user units'),
  })
  .strict()
  .describe('Optional per-side padding around a plot layout frame or coordinate composition');

const LayoutShiftSchema = z
  .object({
    along: z.number().finite().optional().describe('Additional shift along the placement side in user units'),
    normal: z.number().finite().optional().describe('Additional shift along the placement outward normal in user units'),
  })
  .strict()
  .superRefine((shift, ctx) => {
    if (shift.along === undefined && shift.normal === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: 'layout placement shift requires along or normal',
      });
    }
  })
  .describe('Local tangent/normal shift for a layout placement');

const SideLayoutPlacementSchema = z
  .object({
    kind: z.literal(LayoutPlacementKind.Side).describe('Placement discriminator: place the decoration on a frame side'),
    target: z.enum(LayoutPlacementTarget).optional().describe('Target frame used by this placement; omit = frame'),
    view: z.string().min(1).optional().describe('Coordinate view id when target is view'),
    side: z.enum(AxisCardinalSide).describe('Cardinal side used by this placement'),
    placement: z
      .union([z.enum(GeometryLabelPosition), NormalizedRatioSchema])
      .optional()
      .describe('Position along the side: core label keyword or normalized number from start to end'),
    padding: z.number().nonnegative().optional().describe('Outward padding from the target side in user units'),
    shift: LayoutShiftSchema.optional().describe('Additional local shift after side placement is resolved'),
    anchor: z.enum(LayoutAnchor).optional().describe('Text anchor relative to the resolved placement point'),
  })
  .strict()
  .superRefine((placement, ctx) => {
    if (placement.view !== undefined && placement.target !== LayoutPlacementTarget.View) {
      ctx.addIssue({
        code: 'custom',
        path: ['view'],
        message: 'layout placement view is only valid when target is view',
      });
    }
  })
  .describe('Side-based plot decoration placement');

const PointLayoutPlacementSchema = z
  .object({
    kind: z.literal(LayoutPlacementKind.Point).describe('Placement discriminator: place the decoration at a normalized point'),
    target: z.enum(LayoutPlacementTarget).optional().describe('Target frame used by this placement; omit = frame'),
    view: z.string().min(1).optional().describe('Coordinate view id when target is view'),
    x: NormalizedRatioSchema.describe('Normalized x position inside the target frame'),
    y: NormalizedRatioSchema.describe('Normalized y position inside the target frame'),
    anchor: z.enum(LayoutAnchor).optional().describe('Text anchor relative to the resolved point'),
  })
  .strict()
  .superRefine((placement, ctx) => {
    if (placement.view !== undefined && placement.target !== LayoutPlacementTarget.View) {
      ctx.addIssue({
        code: 'custom',
        path: ['view'],
        message: 'layout placement view is only valid when target is view',
      });
    }
  })
  .describe('Point-based plot decoration placement');

export const LayoutPlacementSchema = z
  .discriminatedUnion('kind', [SideLayoutPlacementSchema, PointLayoutPlacementSchema])
  .describe('Plot decoration placement relative to the frame, plot area, or a coordinate view');

export const PlotLayoutSchema = z
  .object({
    mode: z.enum(PlotLayoutMode).optional().describe('Layout mode: auto reserves decoration space; fixed keeps explicit padding only'),
    autoPadding: z.boolean().optional().describe('Whether visible labels may expand outer padding; omit = true'),
    padding: BoxPaddingSchema.optional().describe('Outer padding applied before automatic label reservation'),
    maxIterations: z.number().int().positive().max(5).optional().describe('Maximum deterministic layout stabilization iterations; omit = 3'),
    collision: z
      .object({
        strategy: z.enum(LayoutCollisionStrategy).optional().describe('How unresolved layout collisions are handled'),
        padding: z.number().nonnegative().optional().describe('Minimum padding between colliding layout boxes in user units'),
      })
      .strict()
      .optional()
      .describe('Unresolved layout collision policy'),
  })
  .strict()
  .describe('Plot-level label space layout strategy');

const PlotTextLabelSchema = z
  .object({
    type: z.literal(PlotLabelType.Text).describe('Label discriminator: static plot text'),
    id: z.string().min(1).optional().describe('Optional label id used for stable output metadata'),
    role: z.enum(PlotLabelRole).optional().describe('Semantic text label role used for defaults and priority'),
    text: PlotLabelTextSchema.describe('Label text block'),
    placement: LayoutPlacementSchema.optional().describe('Label placement; omit to derive from role'),
    reserveSpace: z.boolean().optional().describe('Whether this label participates in layout reservation'),
    priority: z.number().finite().optional().describe('Collision priority; higher priority labels are preserved first'),
    overflow: z.enum(PlotLabelOverflow).optional().describe('How label overflow is handled'),
    ...GuideTextStyleSchema.shape,
  })
  .strict()
  .describe('Static plot text label');

export const PlotLabelSchema = PlotTextLabelSchema.describe('Plot label entry');
