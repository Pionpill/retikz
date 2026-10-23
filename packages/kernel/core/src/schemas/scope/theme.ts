import { NonBlankStringSchema } from '@retikz/foundation';
import { strictObject, enum as zodEnum } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { ThemeMode } from '../../shared';

/** 校验场景或作用域对主题风格与明暗模式的稀疏覆盖 */
export const ThemeSchema = strictObject({
  name: NonBlankStringSchema.optional().describe('Sparse visual personality name inherited from the enclosing Theme.'),
  mode: zodEnum(ThemeMode).optional().describe('Sparse light or dark environment inherited from the enclosing Theme.'),
}).describe('Sparse Theme override for a Scene or Scope.');

export type IRTheme = ZodInfer<typeof ThemeSchema>;
