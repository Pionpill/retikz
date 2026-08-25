import type { infer as ZodInfer } from 'zod';

import { array, strictObject } from 'zod';

import { PathCommandSchema, TransformSchema } from '../../schemas';

/** 内置 stroke Path 发布的最终命令与 Path-local transform 产物 */
export const StrokePathOwnerOutputSchema = strictObject({
  commands: array(PathCommandSchema).describe('Settled commands in the Path occurrence local coordinate system.'),
  transforms: array(TransformSchema).describe(
    'Path-level rotate and scale transforms in the same local coordinate system.',
  ),
}).describe('Settled stroke Path output exposed to compile observers.');

/** 内置 stroke Path 的最终所属者产物 */
export type StrokePathOwnerOutput = ZodInfer<typeof StrokePathOwnerOutputSchema>;
