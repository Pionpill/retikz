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
  resolve: spec => ({ kind: 'circle', params: { cx: spec.params.cx, cy: spec.params.cy, r: spec.params.r } }),
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
export const EllipseClipDefinition = defineClip<IREllipseClip, EllipseClipShape>({
  kind: 'ellipse',
  schema: EllipseClipSchema,
  resolve: spec => ({
    kind: 'ellipse',
    params: { cx: spec.params.cx, cy: spec.params.cy, rx: spec.params.rx, ry: spec.params.ry },
  }),
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
export const PolygonClipDefinition = defineClip<IRPolygonClip, PolygonClipShape>({
  kind: 'polygon',
  schema: PolygonClipSchema,
  resolve: spec => ({ kind: 'polygon', params: { points: spec.params.points } }),
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
export const PathClipDefinition = defineClip<IRPathClip, PathClipShape>({
  kind: 'path',
  schema: PathClipSchema,
  resolve: spec => ({
    kind: 'path',
    params: {
      commands: spec.params.commands,
      ...(spec.params.fillRule === undefined ? {} : { fillRule: spec.params.fillRule }),
    },
  }),
  lower: shape => ({ commands: shape.params.commands, fillRule: shape.params.fillRule ?? 'nonzero' }),
});

/** Extension 提供的完整复合裁剪 Definition */
export const CompoundClipDefinition = defineClip<IRCompoundClip, CompoundClipShape>({
  kind: 'compound',
  schema: CompoundClipSchema,
  resolve: (spec, context) => ({
    kind: 'compound',
    params: {
      children: spec.params.children.map(child => context.resolve(child)),
      ...(spec.params.fillRule === undefined ? {} : { fillRule: spec.params.fillRule }),
    },
  }),
  lower: (shape, context) => ({
    commands: shape.params.children.flatMap(child => context.lower(child).commands),
    fillRule: shape.params.fillRule ?? 'nonzero',
  }),
});
