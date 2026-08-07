import { z } from 'zod';

import type { AnyPathKindDefinition } from '../../contract';
import type { StrokePathOwnerOutput } from '../../contract';
import type { IRJsonObject } from '../../schemas';

import { definePathKind, StrokePathOwnerOutputSchema } from '../../contract';
import { PathKind } from '../../schemas';

/** 标准描边 path kind：复用 core 的 stroke emission */
const strokePathKind = definePathKind<IRJsonObject, StrokePathOwnerOutput>({
  schema: z.object({ kind: z.literal(PathKind.Stroke) }),
  ownerOutput: { schema: StrokePathOwnerOutputSchema },
  compile: context =>
    context.ownerOutput.requested
      ? context.emitStroke(context.path, {
          captureOwnerOutput: value => context.ownerOutput.publish(value),
        })
      : context.emitStroke(context.path),
});

/** 标准 ribbon path kind：复用 core 的 ribbon emission */
const ribbonPathKind = definePathKind({
  schema: z.object({ kind: z.literal(PathKind.Ribbon) }),
  compile: context => context.emitRibbon(context.path),
});

/** 内置 path kind provider 注册项 */
export const BUILTIN_PATH_KINDS: ReadonlyArray<AnyPathKindDefinition> = [strokePathKind, ribbonPathKind];
