import type { PatternDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';
import { BUILTIN_PATTERNS } from './definitions';

/** 解析 pattern provider 注册表：内置项先注册，自定义项后注册并复用统一冲突诊断 */
export const resolvePatternRegistry = (
  patterns?: ReadonlyArray<PatternDefinition>,
): ReadonlyMap<string, PatternDefinition> =>
  resolveProviderRegistry({
    capability: 'pattern shape',
    builtins: BUILTIN_PATTERNS,
    custom: patterns,
    keyOf: definition => definition.name,
  });
