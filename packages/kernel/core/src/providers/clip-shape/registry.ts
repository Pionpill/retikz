import type { AnyClipShapeDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';
import { BUILTIN_CLIP_SHAPES } from './definitions';

/** 解析 ClipShape provider 注册表 */
export const resolveClipShapeRegistry = (
  clipShapes?: ReadonlyArray<AnyClipShapeDefinition>,
): ReadonlyMap<string, AnyClipShapeDefinition> =>
  resolveProviderRegistry({
    capability: 'clip shape',
    builtins: BUILTIN_CLIP_SHAPES,
    custom: clipShapes,
    keyOf: definition => definition.kind,
  });
