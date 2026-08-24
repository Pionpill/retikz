import type { infer as ZodInfer } from 'zod';

import type { ScopeSelfPointSchema } from './schema';

/** Scope 固有局部坐标系中的自身参照点 */
export type IRScopeSelfPoint = ZodInfer<typeof ScopeSelfPointSchema>;
