import { ClipFillRuleSchema, defineClip, JsonObjectSchema, PathCommandSchema, PositionSchema } from '@retikz/core';
import { NonBlankStringSchema, PositiveNumberSchema } from '@retikz/foundation';
import { z } from 'zod';

import type {
  CircleClipShape,
  CompoundClipShape,
  EllipseClipShape,
  IRCircleClip,
  IRCompoundClip,
  IREllipseClip,
  IRPathClip,
  IRPolygonClip,
  PathClipShape,
  PolygonClipShape,
} from './types';

import { CircleClipSchema, CompoundClipSchema, EllipseClipSchema, PathClipSchema, PolygonClipSchema } from './schema';

const OpenClipShapeSchema = z.intersection(
  z.object({ kind: NonBlankStringSchema.describe('Clip definition discriminator.') }),
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
  children: z.array(OpenClipShapeSchema).min(1),
  fillRule: ClipFillRuleSchema.optional(),
});

/** Standard 提供的完整圆形裁剪 Definition */
export const CircleClipDefinition = defineClip<IRCircleClip, CircleClipShape>({
  kind: 'circle',
  schema: CircleClipSchema,
  resolve: spec => ({ kind: 'circle', cx: spec.cx, cy: spec.cy, r: spec.r }),
  shapeSchema: CircleClipShapeSchema,
  lower: (shape, context) => ({
    commands: [
      { kind: 'move', to: [context.round(shape.cx) + context.round(shape.r), context.round(shape.cy)] },
      { kind: 'arc', center: [shape.cx, shape.cy], radius: shape.r, startAngle: 0, endAngle: 360 },
      { kind: 'close' },
    ],
    fillRule: 'nonzero',
  }),
});

/** Standard 提供的完整椭圆裁剪 Definition */
export const EllipseClipDefinition = defineClip<IREllipseClip, EllipseClipShape>({
  kind: 'ellipse',
  schema: EllipseClipSchema,
  resolve: spec => ({ kind: 'ellipse', cx: spec.cx, cy: spec.cy, rx: spec.rx, ry: spec.ry }),
  shapeSchema: EllipseClipShapeSchema,
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

/** Standard 提供的完整多边形裁剪 Definition */
export const PolygonClipDefinition = defineClip<IRPolygonClip, PolygonClipShape>({
  kind: 'polygon',
  schema: PolygonClipSchema,
  resolve: spec => ({ kind: 'polygon', points: spec.points }),
  shapeSchema: PolygonClipShapeSchema,
  lower: shape => ({
    commands: [
      { kind: 'move', to: shape.points[0] },
      ...shape.points.slice(1).map(to => ({ kind: 'line' as const, to })),
      { kind: 'close' },
    ],
    fillRule: 'nonzero',
  }),
});

/** Standard 提供的完整路径裁剪 Definition */
export const PathClipDefinition = defineClip<IRPathClip, PathClipShape>({
  kind: 'path',
  schema: PathClipSchema,
  resolve: spec => ({
    kind: 'path',
    commands: spec.commands,
    ...(spec.fillRule === undefined ? {} : { fillRule: spec.fillRule }),
  }),
  shapeSchema: PathClipShapeSchema,
  lower: shape => ({ commands: shape.commands, fillRule: shape.fillRule ?? 'nonzero' }),
});

/** Standard 提供的完整复合裁剪 Definition */
export const CompoundClipDefinition = defineClip<IRCompoundClip, CompoundClipShape>({
  kind: 'compound',
  schema: CompoundClipSchema,
  resolve: (spec, context) => ({
    kind: 'compound',
    children: spec.children.map(child => context.resolve(child)),
    ...(spec.fillRule === undefined ? {} : { fillRule: spec.fillRule }),
  }),
  shapeSchema: CompoundClipShapeSchema,
  lower: (shape, context) => ({
    commands: shape.children.flatMap(child => context.lower(child).commands),
    fillRule: shape.fillRule ?? 'nonzero',
  }),
});
