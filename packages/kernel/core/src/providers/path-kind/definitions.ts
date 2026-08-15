import type { AnyPathKindDefinition } from '../../contract';
import type { StrokePathOwnerOutput } from '../../contract';
import type { IRPathBase } from '../../schemas';

import { definePathKind, StrokePathOwnerOutputSchema } from '../../contract';
import { PathKind, StrokePathSchema } from '../../schemas';

/** 标准描边 path kind：复用 core 的 stroke emission */
const strokePathKind = definePathKind<IRPathBase, StrokePathOwnerOutput>({
  name: PathKind.Stroke,
  schema: StrokePathSchema,
  ownerOutput: { schema: StrokePathOwnerOutputSchema },
  compile: context =>
    context.ownerOutput.requested
      ? context.emitStroke(context.path, {
          captureOwnerOutput: value => context.ownerOutput.publish(value),
        })
      : context.emitStroke(context.path),
});

/** 内置 path kind provider 注册项 */
export const BUILTIN_PATH_KINDS: ReadonlyArray<AnyPathKindDefinition> = [strokePathKind];
