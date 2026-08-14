import type { ClipDefinition } from '../../contract';
import type { IRCircleClipSpec, IREllipseClipSpec, IRRectClipSpec } from '../../schemas';

import { defineClip } from '../../contract';
import { CircleClipSchema, EllipseClipSchema, RectClipSchema } from '../../schemas';
import { defineKeyedProviderArray } from '../registry/index';

/** 内置 clip provider 名称 */
export type BuiltinClipProviderName = 'rect' | 'circle' | 'ellipse';

const keyOfBuiltinClip = (definition: ClipDefinition): BuiltinClipProviderName => {
  switch (definition.kind) {
    case 'rect':
    case 'circle':
    case 'ellipse':
      return definition.kind;
    default:
      throw new Error(`Unknown builtin clip provider kind '${definition.kind}'.`);
  }
};

/** 矩形 clip provider：将 IR rect spec 直接映射为 Scene rect clip */
const rectClip = defineClip<IRRectClipSpec>({
  kind: 'rect',
  schema: RectClipSchema,
  resolve: spec => ({ kind: 'rect', x: spec.x, y: spec.y, width: spec.width, height: spec.height }),
});

/** 圆形 clip provider：将 IR circle spec 直接映射为 Scene circle clip */
const circleClip = defineClip<IRCircleClipSpec>({
  kind: 'circle',
  schema: CircleClipSchema,
  resolve: spec => ({ kind: 'circle', cx: spec.cx, cy: spec.cy, r: spec.r }),
});

/** 椭圆 clip provider：将 IR ellipse spec 直接映射为 Scene ellipse clip */
const ellipseClip = defineClip<IREllipseClipSpec>({
  kind: 'ellipse',
  schema: EllipseClipSchema,
  resolve: spec => ({ kind: 'ellipse', cx: spec.cx, cy: spec.cy, rx: spec.rx, ry: spec.ry }),
});

/** 内置 clip provider 注册项，按 `kind` 同时提供属性索引 */
export const BUILTIN_CLIPS = defineKeyedProviderArray<ClipDefinition, BuiltinClipProviderName>(
  [rectClip, circleClip, ellipseClip],
  keyOfBuiltinClip,
);
