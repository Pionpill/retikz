import type { ClipDefinition, RectClipShape } from '../contract';
import { defineClip } from '../contract';
import type { IRRectClip } from '../schemas';
import { RectClipSchema } from '../schemas';
import { createProviderRegistry } from './registry';

/** Core 内置的完整矩形 Clip Definition */
const rectClip = defineClip<IRRectClip, RectClipShape>({
  kind: 'rect',
  schema: RectClipSchema,
  resolve: spec => ({ kind: 'rect', x: spec.x, y: spec.y, width: spec.width, height: spec.height }),
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

/** 内置 clip provider 注册项，按 `kind` 索引 */
export const BUILTIN_CLIPS: ReadonlyMap<string, ClipDefinition> = new Map([[rectClip.kind, rectClip]]);

/** 解析 clip provider 注册表：内置项先注册，自定义项后注册并复用统一冲突诊断 */
export const resolveClipRegistry = (clips?: ReadonlyArray<ClipDefinition>): ReadonlyMap<string, ClipDefinition> =>
  createProviderRegistry({
    capability: 'clip',
    builtins: BUILTIN_CLIPS,
    custom: clips,
    keyOf: definition => definition.kind,
  });
