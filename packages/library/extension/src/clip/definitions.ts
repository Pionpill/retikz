import { defineClip } from '@retikz/core';

import { CircleClipSchema, CompoundClipSchema, EllipseClipSchema, PathClipSchema, PolygonClipSchema } from './schema';
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

/** Extension 提供的完整圆形裁剪 Definition */
export const CircleClipDefinition = defineClip<IRCircleClip, CircleClipShape>({
  kind: 'circle',
  schema: CircleClipSchema,
  resolve: spec => ({ kind: 'circle', cx: spec.cx, cy: spec.cy, r: spec.r }),
  lower: (shape, context) => ({
    commands: [
      { kind: 'move', to: [context.round(shape.cx) + context.round(shape.r), context.round(shape.cy)] },
      { kind: 'arc', center: [shape.cx, shape.cy], radius: shape.r, startAngle: 0, endAngle: 360 },
      { kind: 'close' },
    ],
    fillRule: 'nonzero',
  }),
});

/** Extension 提供的完整椭圆裁剪 Definition */
export const EllipseClipDefinition = defineClip<IREllipseClip, EllipseClipShape>({
  kind: 'ellipse',
  schema: EllipseClipSchema,
  resolve: spec => ({ kind: 'ellipse', cx: spec.cx, cy: spec.cy, rx: spec.rx, ry: spec.ry }),
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

/** Extension 提供的完整多边形裁剪 Definition */
export const PolygonClipDefinition = defineClip<IRPolygonClip, PolygonClipShape>({
  kind: 'polygon',
  schema: PolygonClipSchema,
  resolve: spec => ({ kind: 'polygon', points: spec.points }),
  lower: shape => ({
    commands: [
      { kind: 'move', to: shape.points[0] },
      ...shape.points.slice(1).map(to => ({ kind: 'line' as const, to })),
      { kind: 'close' },
    ],
    fillRule: 'nonzero',
  }),
});

/** Extension 提供的完整路径裁剪 Definition */
export const PathClipDefinition = defineClip<IRPathClip, PathClipShape>({
  kind: 'path',
  schema: PathClipSchema,
  resolve: spec => ({
    kind: 'path',
    commands: spec.commands,
    ...(spec.fillRule === undefined ? {} : { fillRule: spec.fillRule }),
  }),
  lower: shape => ({ commands: shape.commands, fillRule: shape.fillRule ?? 'nonzero' }),
});

/** Extension 提供的完整复合裁剪 Definition */
export const CompoundClipDefinition = defineClip<IRCompoundClip, CompoundClipShape>({
  kind: 'compound',
  schema: CompoundClipSchema,
  resolve: (spec, context) => ({
    kind: 'compound',
    children: spec.children.map(child => context.resolve(child)),
    ...(spec.fillRule === undefined ? {} : { fillRule: spec.fillRule }),
  }),
  lower: (shape, context) => ({
    commands: shape.children.flatMap(child => context.lower(child).commands),
    fillRule: shape.fillRule ?? 'nonzero',
  }),
});
