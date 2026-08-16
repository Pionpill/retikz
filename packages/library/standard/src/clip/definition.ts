import { defineClip } from '@retikz/core';

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

/** Standard 提供的圆形裁剪 Definition */
export const CircleClipDefinition = defineClip<IRCircleClip, CircleClipShape>({
  kind: 'circle',
  schema: CircleClipSchema,
  resolve: spec => ({ kind: 'circle', cx: spec.cx, cy: spec.cy, r: spec.r }),
});

/** Standard 提供的椭圆裁剪 Definition */
export const EllipseClipDefinition = defineClip<IREllipseClip, EllipseClipShape>({
  kind: 'ellipse',
  schema: EllipseClipSchema,
  resolve: spec => ({ kind: 'ellipse', cx: spec.cx, cy: spec.cy, rx: spec.rx, ry: spec.ry }),
});

/** Standard 提供的多边形裁剪 Definition */
export const PolygonClipDefinition = defineClip<IRPolygonClip, PolygonClipShape>({
  kind: 'polygon',
  schema: PolygonClipSchema,
  resolve: spec => ({ kind: 'polygon', points: spec.points }),
});

/** Standard 提供的路径裁剪 Definition */
export const PathClipDefinition = defineClip<IRPathClip, PathClipShape>({
  kind: 'path',
  schema: PathClipSchema,
  resolve: spec => ({
    kind: 'path',
    commands: spec.commands,
    ...(spec.fillRule === undefined ? {} : { fillRule: spec.fillRule }),
  }),
});

/** Standard 提供的复合裁剪 Definition */
export const CompoundClipDefinition = defineClip<IRCompoundClip, CompoundClipShape>({
  kind: 'compound',
  schema: CompoundClipSchema,
  resolve: (spec, context) => ({
    kind: 'compound',
    children: spec.children.map(child => context.resolve(child)),
    ...(spec.fillRule === undefined ? {} : { fillRule: spec.fillRule }),
  }),
});
