import type { ClipDefinition } from '../../contract';
import type { IRRectClip } from '../../schemas';

import { defineClip } from '../../contract';
import { RectClipSchema } from '../../schemas';
import { defineKeyedProviderArray } from '../registry/index';

/** 内置 clip provider 名称 */
export type BuiltinClipProviderName = 'rect';

const keyOfBuiltinClip = (definition: ClipDefinition): BuiltinClipProviderName => {
  switch (definition.kind) {
    case 'rect':
      return definition.kind;
    default:
      throw new Error(`Unknown builtin clip provider kind '${definition.kind}'.`);
  }
};

/** 矩形 clip provider：将 IR rect spec 直接映射为 Scene rect clip */
const rectClip = defineClip<IRRectClip>({
  kind: 'rect',
  schema: RectClipSchema,
  resolve: spec => ({ kind: 'rect', x: spec.x, y: spec.y, width: spec.width, height: spec.height }),
});

/** 内置 clip provider 注册项，按 `kind` 同时提供属性索引 */
export const BUILTIN_CLIPS = defineKeyedProviderArray<ClipDefinition, BuiltinClipProviderName>(
  [rectClip],
  keyOfBuiltinClip,
);
