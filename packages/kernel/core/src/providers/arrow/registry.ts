import type { ArrowDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';
import { BUILTIN_ARROWS } from './definitions';

/** 解析 arrow provider 注册表：内置项先注册，自定义项后注册并复用统一冲突诊断。 */
export const resolveArrowRegistry = (arrows?: ReadonlyArray<ArrowDefinition>): ReadonlyMap<string, ArrowDefinition> =>
  resolveProviderRegistry({
    capability: 'arrow',
    builtins: BUILTIN_ARROWS,
    custom: arrows,
    keyOf: definition => definition.name,
  });
