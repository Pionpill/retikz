import type { ClipDefinition } from '../../contract';

import { defineClip } from '../../contract';
import {
  CircleClipSchema,
  CompoundClipSchema,
  EllipseClipSchema,
  PathClipSchema,
  PolygonClipSchema,
  RectClipSchema,
} from '../../schemas';
import { resolveProviderRegistry } from '../registry';

export type BuiltinClipProviderName = 'rect' | 'circle' | 'ellipse' | 'polygon' | 'path' | 'compound';

export const BUILTIN_CLIPS: ReadonlyArray<ClipDefinition> & Readonly<Record<BuiltinClipProviderName, ClipDefinition>> =
  Object.assign(
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
      defineClip({
        kind: 'compound',
        schema: CompoundClipSchema,
        resolve: (spec, context) => ({
          kind: 'compound',
          children: spec.children.map(child => context.resolve(child)),
          fillRule: spec.fillRule,
        }),
      }),
    ],
    {} as Record<BuiltinClipProviderName, ClipDefinition>,
  );

for (const definition of BUILTIN_CLIPS) {
  (BUILTIN_CLIPS as unknown as Record<string, ClipDefinition>)[definition.kind] = definition;
}

export const resolveClipRegistry = (clips?: ReadonlyArray<ClipDefinition>): ReadonlyMap<string, ClipDefinition> =>
  resolveProviderRegistry({
    capability: 'clip',
    builtins: BUILTIN_CLIPS,
    custom: clips,
    keyOf: definition => definition.kind,
    optionName: 'clips',
  });
