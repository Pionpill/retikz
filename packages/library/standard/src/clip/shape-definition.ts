import { ClipFillRuleSchema, defineClipShape, JsonObjectSchema, PathCommandSchema, PositionSchema } from '@retikz/core';
import { PositiveNumberSchema } from '@retikz/foundation';
import { z } from 'zod';

import type { CircleClipShape, CompoundClipShape, EllipseClipShape, PathClipShape, PolygonClipShape } from './types';

const ClipShapeSchema = z.intersection(
  z.object({ kind: z.string().min(1).describe('Clip shape registry discriminator.') }),
  JsonObjectSchema,
);

const CircleClipShapeSchema: z.ZodType<CircleClipShape> = z.strictObject({
  kind: z.literal('circle'),
  cx: z.number(),
  cy: z.number(),
  r: PositiveNumberSchema,
});

const EllipseClipShapeSchema: z.ZodType<EllipseClipShape> = z.strictObject({
  kind: z.literal('ellipse'),
  cx: z.number(),
  cy: z.number(),
  rx: PositiveNumberSchema,
  ry: PositiveNumberSchema,
});

const PolygonClipShapeSchema: z.ZodType<PolygonClipShape> = z.strictObject({
  kind: z.literal('polygon'),
  points: z.array(PositionSchema).min(3),
});

const PathClipShapeSchema: z.ZodType<PathClipShape> = z.strictObject({
  kind: z.literal('path'),
  commands: z.array(PathCommandSchema).min(1),
  fillRule: ClipFillRuleSchema.optional(),
});

const CompoundClipShapeSchema: z.ZodType<CompoundClipShape> = z.strictObject({
  kind: z.literal('compound'),
  children: z.array(ClipShapeSchema).min(1),
  fillRule: ClipFillRuleSchema.optional(),
});

/** Standard 圆形 ClipShape Definition */
export const CircleClipShapeDefinition = defineClipShape<CircleClipShape>({
  kind: 'circle',
  schema: CircleClipShapeSchema,
  lower: (shape, context) => ({
    commands: [
      { kind: 'move', to: [context.round(shape.cx) + context.round(shape.r), context.round(shape.cy)] },
      { kind: 'arc', center: [shape.cx, shape.cy], radius: shape.r, startAngle: 0, endAngle: 360 },
      { kind: 'close' },
    ],
    fillRule: 'nonzero',
  }),
});

/** Standard 椭圆 ClipShape Definition */
export const EllipseClipShapeDefinition = defineClipShape<EllipseClipShape>({
  kind: 'ellipse',
  schema: EllipseClipShapeSchema,
  lower: (shape, context) => ({
    commands: [
      { kind: 'move', to: [context.round(shape.cx) + context.round(shape.rx), context.round(shape.cy)] },
      {
        kind: 'ellipseArc',
        center: [shape.cx, shape.cy],
        radiusX: shape.rx,
        radiusY: shape.ry,
        startAngle: 0,
        endAngle: 360,
      },
      { kind: 'close' },
    ],
    fillRule: 'nonzero',
  }),
});

/** Standard 多边形 ClipShape Definition */
export const PolygonClipShapeDefinition = defineClipShape<PolygonClipShape>({
  kind: 'polygon',
  schema: PolygonClipShapeSchema,
  lower: shape => ({
    commands: [
      { kind: 'move', to: shape.points[0] },
      ...shape.points.slice(1).map(to => ({ kind: 'line' as const, to })),
      { kind: 'close' },
    ],
    fillRule: 'nonzero',
  }),
});

/** Standard 路径 ClipShape Definition */
export const PathClipShapeDefinition = defineClipShape<PathClipShape>({
  kind: 'path',
  schema: PathClipShapeSchema,
  lower: shape => ({ commands: shape.commands, fillRule: shape.fillRule ?? 'nonzero' }),
});

/** Standard 复合 ClipShape Definition */
export const CompoundClipShapeDefinition = defineClipShape<CompoundClipShape>({
  kind: 'compound',
  schema: CompoundClipShapeSchema,
  lower: (shape, context) => ({
    commands: shape.children.flatMap(child => context.lower(child).commands),
    fillRule: shape.fillRule ?? 'nonzero',
  }),
});
