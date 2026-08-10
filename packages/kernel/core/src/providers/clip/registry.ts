import type { ClipDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry/index';
import { BUILTIN_CLIPS } from './definitions';

/** 解析 clip provider 注册表：内置项先注册，自定义项后注册并复用统一冲突诊断 */
export const resolveClipRegistry = (clips?: ReadonlyArray<ClipDefinition>): ReadonlyMap<string, ClipDefinition> =>
  resolveProviderRegistry({
    capability: 'clip',
    builtins: BUILTIN_CLIPS,
    custom: clips,
    keyOf: definition => definition.kind,
  });
