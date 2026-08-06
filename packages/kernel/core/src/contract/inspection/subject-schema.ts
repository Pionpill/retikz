import { z } from 'zod';

import { PathCommandSchema, TransformSchema } from '../../schemas';

/** 内置 stroke Path Inspector 读取的 settled command snapshot schema */
export const StrokePathInspectionSubjectSchema = z
  .strictObject({
    commands: z.array(PathCommandSchema).describe('Settled commands in the Path occurrence local coordinate system.'),
    transforms: z
      .array(TransformSchema)
      .describe('Path-level rotate and scale transforms in the same local coordinate system.'),
  })
  .describe('Settled stroke Path geometry exposed to its Inspector.');

/** 内置 stroke Path Inspector 读取的 settled command snapshot */
export type StrokePathInspectionSubject = z.infer<typeof StrokePathInspectionSubjectSchema>;
