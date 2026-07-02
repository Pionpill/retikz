import type { ClipDefinition } from '../../contract';
import type { IRCompoundClipSpec } from '../../schemas';

import { defineClip } from '../../contract';
import {
  CircleClipSchema,
  CompoundClipSchema,
  EllipseClipSchema,
  PathClipSchema,
  PolygonClipSchema,
  RectClipSchema,
} from '../../schemas';
import { defineKeyedProviderArray, resolveProviderRegistry } from '../registry';

/** 内置 clip provider 名称。 */
export type BuiltinClipProviderName = 'rect' | 'circle' | 'ellipse' | 'polygon' | 'path' | 'compound';

const keyOfBuiltinClip = (definition: ClipDefinition): BuiltinClipProviderName => {
  switch (definition.kind) {
    case 'rect':
    case 'circle':
    case 'ellipse':
    case 'polygon':
    case 'path':
    case 'compound':
      return definition.kind;
    default:
      throw new Error(`Unknown builtin clip provider kind '${definition.kind}'.`);
  }
};

/** 内置 clip provider 注册项，按 `kind` 同时提供属性索引。 */
export const BUILTIN_CLIPS = defineKeyedProviderArray<ClipDefinition, BuiltinClipProviderName>(
  [
    defineClip({
      kind: 'rect',
      schema: RectClipSchema,
      resolve: spec => ({ kind: 'rect', x: spec.x, y: spec.y, width: spec.width, height: spec.height }),
    }),
    defineClip({
      kind: 'circle',
      schema: CircleClipSchema,
      resolve: spec => ({ kind: 'circle', cx: spec.cx, cy: spec.cy, r: spec.r }),
    }),
    defineClip({
      kind: 'ellipse',
      schema: EllipseClipSchema,
      resolve: spec => ({ kind: 'ellipse', cx: spec.cx, cy: spec.cy, rx: spec.rx, ry: spec.ry }),
    }),
    defineClip({
      kind: 'polygon',
      schema: PolygonClipSchema,
      resolve: spec => ({ kind: 'polygon', points: spec.points }),
    }),
    defineClip({
      kind: 'path',
      schema: PathClipSchema,
      resolve: spec => ({ kind: 'path', commands: spec.commands, fillRule: spec.fillRule }),
    }),
    defineClip<IRCompoundClipSpec>({
      kind: 'compound',
      schema: CompoundClipSchema,
      resolve: (spec, context) => ({
        kind: 'compound',
        children: spec.children.map(child => context.resolve(child)),
        fillRule: spec.fillRule,
      }),
    }),
  ],
  keyOfBuiltinClip,
);

export const resolveClipRegistry = (clips?: ReadonlyArray<ClipDefinition>): ReadonlyMap<string, ClipDefinition> =>
  resolveProviderRegistry({
    capability: 'clip',
    builtins: BUILTIN_CLIPS,
    custom: clips,
    keyOf: definition => definition.kind,
  });
