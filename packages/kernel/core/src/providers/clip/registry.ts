import type { ClipDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';
import { BUILTIN_CLIPS } from './definitions';

export const resolveClipRegistry = (clips?: ReadonlyArray<ClipDefinition>): ReadonlyMap<string, ClipDefinition> =>
  resolveProviderRegistry({
    capability: 'clip',
    builtins: BUILTIN_CLIPS,
    custom: clips,
    keyOf: definition => definition.kind,
  });
