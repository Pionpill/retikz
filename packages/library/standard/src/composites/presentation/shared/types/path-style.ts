import type { infer as ZodInfer } from 'zod';

import type { StandardPathBorderStyleSchema, StandardPathStrokeStyleSchema } from '../schemas';

/** Standard composite 复用的 Path 描边样式 */
export type IRStandardPathStrokeStyle = ZodInfer<typeof StandardPathStrokeStyleSchema>;

/** Standard composite 复用的 Path 边框样式 */
export type IRStandardPathBorderStyle = ZodInfer<typeof StandardPathBorderStyleSchema>;
