import { z } from 'zod';

import { PathCommandSchema, TransformSchema } from '../../schemas';

/** 内置 stroke Path 发布的最终命令与 Path-local transform 产物 */
export const StrokePathOwnerOutputSchema = z
  .strictObject({
    commands: z.array(PathCommandSchema).describe('Settled commands in the Path occurrence local coordinate system.'),
    transforms: z
      .array(TransformSchema)
      .describe('Path-level rotate and scale transforms in the same local coordinate system.'),
  })
  .describe('Settled stroke Path output exposed to compile observers.');

/** 内置 stroke Path 的最终所属者产物 */
export type StrokePathOwnerOutput = z.infer<typeof StrokePathOwnerOutputSchema>;
