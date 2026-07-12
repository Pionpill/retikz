import type { BoundaryDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';
import { BUILTIN_BOUNDARIES } from './definitions';

/** 解析 boundary provider 注册表：内置项先注册，自定义项后注册并复用统一冲突诊断。 */
export const resolveBoundaryRegistry = (
  boundaries?: ReadonlyArray<BoundaryDefinition>,
): ReadonlyMap<string, BoundaryDefinition> =>
  resolveProviderRegistry({
    capability: 'boundary',
    builtins: BUILTIN_BOUNDARIES,
    custom: boundaries,
    keyOf: definition => definition.name,
  });
