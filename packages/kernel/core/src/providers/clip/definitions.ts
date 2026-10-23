import type { ClipDefinition } from '../../contract';
import type { RectClipShape } from '../../contract';
import { defineClip } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { IRRectClip } from '../../schemas';
import { RectClipSchema } from '../../schemas';
import { defineKeyedProviderArray } from '../registry/index';

/** 内置 clip provider 名称 */
export type BuiltinClipProviderName = 'rect';

const keyOfBuiltinClip = (definition: ClipDefinition): BuiltinClipProviderName => {
  switch (definition.kind) {
    case 'rect':
      return definition.kind;
    default:
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Provider,
        `Unknown builtin clip provider kind '${definition.kind}'.`,
      );
  }
};

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

/** 内置 clip provider 注册项，按 `kind` 同时提供属性索引 */
export const BUILTIN_CLIPS = defineKeyedProviderArray<ClipDefinition, BuiltinClipProviderName>(
  [rectClip],
  keyOfBuiltinClip,
);
