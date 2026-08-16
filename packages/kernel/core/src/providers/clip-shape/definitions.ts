import { z } from 'zod';

import type {
  AnyClipShapeDefinition,
  CircleClipShape,
  ClipShape,
  CompoundClipShape,
  EllipseClipShape,
  PathClipShape,
  PolygonClipShape,
  RectClipShape,
} from '../../contract';

import { defineClipShape } from '../../contract';
import { ClipFillRuleSchema, JsonObjectSchema, PathCommandSchema, PositionSchema } from '../../schemas';
import { defineKeyedProviderArray } from '../registry';

const ClipShapeSchema = z.intersection(
  z.object({ kind: z.string().min(1).describe('Clip shape registry discriminator.') }),
  JsonObjectSchema,
) as z.ZodType<ClipShape>;

const RectClipShapeSchema: z.ZodType<RectClipShape> = z.strictObject({
  kind: z.literal('rect'),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});

const CircleClipShapeSchema: z.ZodType<CircleClipShape> = z.strictObject({
  kind: z.literal('circle'),
  cx: z.number(),
  cy: z.number(),
  r: z.number().positive(),
});

const EllipseClipShapeSchema: z.ZodType<EllipseClipShape> = z.strictObject({
  kind: z.literal('ellipse'),
  cx: z.number(),
  cy: z.number(),
  rx: z.number().positive(),
  ry: z.number().positive(),
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

/** 内置矩形 ClipShape Definition */
export const RectClipShapeDefinition = defineClipShape<RectClipShape>({
  kind: 'rect',
  schema: RectClipShapeSchema,
  lower: shape => ({
    commands: [
      { kind: 'move', to: [shape.x, shape.y] },
      { kind: 'line', to: [shape.x + shape.width, shape.y] },
      { kind: 'line', to: [shape.x + shape.width, shape.y + shape.height] },
      { kind: 'line', to: [shape.x, shape.y + shape.height] },
      { kind: 'close' },
    ],
    fillRule: 'nonzero',
  }),
});

/** 内置圆形 ClipShape Definition */
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

/** 内置椭圆 ClipShape Definition */
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

/** 内置多边形 ClipShape Definition */
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

/** 内置路径 ClipShape Definition */
export const PathClipShapeDefinition = defineClipShape<PathClipShape>({
  kind: 'path',
  schema: PathClipShapeSchema,
  lower: shape => ({ commands: shape.commands, fillRule: shape.fillRule ?? 'nonzero' }),
});

/** 内置复合 ClipShape Definition */
export const CompoundClipShapeDefinition = defineClipShape<CompoundClipShape>({
  kind: 'compound',
  schema: CompoundClipShapeSchema,
  lower: (shape, context) => ({
    commands: shape.children.flatMap(child => context.lower(child).commands),
    fillRule: shape.fillRule ?? 'nonzero',
  }),
});

/** Core 暂时内置的 ClipShape provider 名称 */
export type BuiltinClipShapeProviderName = 'rect' | 'circle' | 'ellipse' | 'polygon' | 'path' | 'compound';

const keyOfBuiltinClipShape = (definition: AnyClipShapeDefinition): BuiltinClipShapeProviderName => {
  switch (definition.kind) {
    case 'rect':
    case 'circle':
    case 'ellipse':
    case 'polygon':
    case 'path':
    case 'compound':
      return definition.kind;
    default:
      throw new Error(`Unknown builtin clip shape provider kind '${definition.kind}'.`);
  }
};

/** Core 暂时内置的六种 ClipShape definitions */
export const BUILTIN_CLIP_SHAPES = defineKeyedProviderArray<AnyClipShapeDefinition, BuiltinClipShapeProviderName>(
  [
    RectClipShapeDefinition,
    CircleClipShapeDefinition,
    EllipseClipShapeDefinition,
    PolygonClipShapeDefinition,
    PathClipShapeDefinition,
    CompoundClipShapeDefinition,
  ],
  keyOfBuiltinClipShape,
);
