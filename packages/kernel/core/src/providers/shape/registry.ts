import type { ShapeDefinition } from '../../contract';

import { resolveProviderRegistry } from '../registry';
import { BUILTIN_SHAPES } from './definitions';

export const resolveShapeRegistry = (shapes?: ReadonlyArray<ShapeDefinition>): ReadonlyMap<string, ShapeDefinition> =>
  resolveProviderRegistry({
    capability: 'shape',
    builtins: BUILTIN_SHAPES,
    custom: shapes,
    keyOf: definition => definition.name,
  });
