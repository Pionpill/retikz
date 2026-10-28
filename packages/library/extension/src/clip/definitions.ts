import { defineClip } from '@retikz/core';

import { CircleClipSchema, CompoundClipSchema, EllipseClipSchema, PathClipSchema, PolygonClipSchema } from './schema';
import type { IRCircleClip, IRCompoundClip, IREllipseClip, IRPathClip, IRPolygonClip } from './types';

/** Extension 提供的完整圆形裁剪 Definition */
export const circleClipDefinition = defineClip<IRCircleClip>({
  kind: 'circle',
  schema: CircleClipSchema,

  lower: (shape, context) => ({
    commands: [
      {
        kind: 'move',
        to: [context.round(shape.params.cx) + context.round(shape.params.r), context.round(shape.params.cy)],
      },
      { kind: 'arc', center: [shape.params.cx, shape.params.cy], radius: shape.params.r, startAngle: 0, endAngle: 360 },
      { kind: 'close' },
    ],
    fillRule: 'nonzero',
  }),
});

/** Extension 提供的完整椭圆裁剪 Definition */
export const ellipseClipDefinition = defineClip<IREllipseClip>({
  kind: 'ellipse',
  schema: EllipseClipSchema,

  lower: (shape, context) => ({
    commands: [
      {
        kind: 'move',
        to: [context.round(shape.params.cx) + context.round(shape.params.rx), context.round(shape.params.cy)],
      },
      {
        kind: 'ellipseArc',
        center: [shape.params.cx, shape.params.cy],
        radiusX: shape.params.rx,
        radiusY: shape.params.ry,
        startAngle: 0,
        endAngle: 360,
      },
      { kind: 'close' },
    ],
    fillRule: 'nonzero',
  }),
});

/** Extension 提供的完整多边形裁剪 Definition */
export const polygonClipDefinition = defineClip<IRPolygonClip>({
  kind: 'polygon',
  schema: PolygonClipSchema,

  lower: shape => ({
    commands: [
      { kind: 'move', to: shape.params.points[0] },
      ...shape.params.points.slice(1).map(to => ({ kind: 'line' as const, to })),
      { kind: 'close' },
    ],
    fillRule: 'nonzero',
  }),
});

/** Extension 提供的完整路径裁剪 Definition */
export const pathClipDefinition = defineClip<IRPathClip>({
  kind: 'path',
  schema: PathClipSchema,

  lower: shape => ({ commands: shape.params.commands, fillRule: shape.params.fillRule ?? 'nonzero' }),
});

/** Extension 提供的完整复合裁剪 Definition */
export const compoundClipDefinition = defineClip<IRCompoundClip>({
  kind: 'compound',
  schema: CompoundClipSchema,

  lower: (shape, context) => ({
    commands: shape.params.children.flatMap(child => context.lower(child).commands),
    fillRule: shape.params.fillRule ?? 'nonzero',
  }),
});
