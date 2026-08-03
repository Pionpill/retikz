import type { z } from 'zod';

import type { StandardPathBorderStyleSchema, StandardPathStrokeStyleSchema } from '../schemas';

/** Standard composite 复用的 Path 描边样式 */
export type IRStandardPathStrokeStyle = z.infer<typeof StandardPathStrokeStyleSchema>;

/** Standard composite 复用的 Path 边框样式 */
export type IRStandardPathBorderStyle = z.infer<typeof StandardPathBorderStyleSchema>;
