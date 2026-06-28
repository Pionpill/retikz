import type { PathKindDefinition } from '../../contract/path';

import { definePathKind } from '../../contract/path';

export const BUILTIN_PATH_KINDS: Record<string, PathKindDefinition> = {
  stroke: definePathKind({
    kind: 'stroke',
    compile: context => context.emitStroke(context.path),
  }),
  ribbon: definePathKind({
    kind: 'ribbon',
    compile: context => context.emitRibbon(context.path),
  }),
};

export const resolvePathKindRegistry = (
  pathKinds?: Record<string, PathKindDefinition>,
): Record<string, PathKindDefinition> => ({
  ...BUILTIN_PATH_KINDS,
  ...(pathKinds ?? {}),
});
