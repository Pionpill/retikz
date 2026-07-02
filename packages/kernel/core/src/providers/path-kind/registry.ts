import { z } from 'zod';

import type { PathKindDefinition } from '../../contract';

import { definePathKind } from '../../contract';
import { resolveProviderRegistry } from '../registry';

export const keyOfPathKind = (definition: PathKindDefinition): string => definition.schema.shape.kind.value;

export const BUILTIN_PATH_KINDS: ReadonlyArray<PathKindDefinition> = [
  definePathKind({
    schema: z.object({ kind: z.literal('stroke') }),
    compile: context => context.emitStroke(context.path),
  }),
  definePathKind({
    schema: z.object({ kind: z.literal('ribbon') }),
    compile: context => context.emitRibbon(context.path),
  }),
];

export const resolvePathKindRegistry = (
  pathKinds?: ReadonlyArray<PathKindDefinition>,
): ReadonlyMap<string, PathKindDefinition> =>
  resolveProviderRegistry({
    capability: 'path kind',
    builtins: BUILTIN_PATH_KINDS,
    custom: pathKinds,
    keyOf: keyOfPathKind,
    optionName: 'pathKinds',
  });
