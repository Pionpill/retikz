import type { ClipDefinition } from '../../contract';
import type { RectClipShape } from '../../contract';
import { defineClip } from '../../contract';
import type { IRRectClip } from '../../schemas';
import { RectClipSchema } from '../../schemas';

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
