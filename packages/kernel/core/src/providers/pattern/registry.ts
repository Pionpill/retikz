import type { PatternDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';
import { BUILTIN_PATTERNS } from './definitions';

export const resolvePatternRegistry = (
  patterns?: ReadonlyArray<PatternDefinition>,
): ReadonlyMap<string, PatternDefinition> =>
  resolveProviderRegistry({
    capability: 'pattern shape',
    builtins: BUILTIN_PATTERNS,
    custom: patterns,
    keyOf: definition => definition.name,
  });
