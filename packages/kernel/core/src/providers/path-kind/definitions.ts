import { z } from 'zod';

import type { PathKindDefinition } from '../../contract';

import { definePathKind } from '../../contract';
import { PathKind } from '../../schemas';

/** 标准描边 path kind：复用 core 的 stroke emission */
const strokePathKind = definePathKind({
  schema: z.object({ kind: z.literal(PathKind.Stroke) }),
  compile: context => context.emitStroke(context.path),
});

/** 标准 ribbon path kind：复用 core 的 ribbon emission */
const ribbonPathKind = definePathKind({
  schema: z.object({ kind: z.literal(PathKind.Ribbon) }),
  compile: context => context.emitRibbon(context.path),
});

/** 内置 path kind provider 注册项 */
export const BUILTIN_PATH_KINDS: ReadonlyArray<PathKindDefinition> = [strokePathKind, ribbonPathKind];
