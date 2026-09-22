import type { IRScopeProps } from '@retikz/core';
import type { infer as ZodInfer, input as ZodInput } from 'zod';

import type { SurfaceSchema } from './schema';

/** Surface 的公开 authoring 输入 */
export type SurfaceInput = IRSurface;

/** 稀疏持久化 Standard Surface composite */
export type IRSurface = Omit<ZodInput<typeof SurfaceSchema>, keyof IRScopeProps | 'child'> &
  IRScopeProps &
  Pick<ZodInfer<typeof SurfaceSchema>, 'child'>;
