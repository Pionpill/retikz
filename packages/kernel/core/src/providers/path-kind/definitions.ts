import { z } from 'zod';

import type { AnyPathKindDefinition } from '../../contract';

import { definePathKind } from '../../contract';
import { StrokePathInspectionSubjectSchema } from '../../contract';
import { PathKind } from '../../schemas';
import { strokePathInspector } from './stroke-inspector';

/** 标准描边 path kind：复用 core 的 stroke emission */
const strokePathKind = definePathKind({
  schema: z.object({ kind: z.literal(PathKind.Stroke) }),
  inspectionSubjectSchema: StrokePathInspectionSubjectSchema,
  inspector: strokePathInspector,
  compile: context => context.emitStroke(context.path, { includeInspectionSubject: true }),
});

/** 标准 ribbon path kind：复用 core 的 ribbon emission */
const ribbonPathKind = definePathKind({
  schema: z.object({ kind: z.literal(PathKind.Ribbon) }),
  compile: context => context.emitRibbon(context.path),
});

/** 内置 path kind provider 注册项 */
export const BUILTIN_PATH_KINDS: ReadonlyArray<AnyPathKindDefinition> = [strokePathKind, ribbonPathKind];
