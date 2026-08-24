import type { infer as ZodInfer } from 'zod';

import type { ThemeSchema } from './schema';

export type IRTheme = ZodInfer<typeof ThemeSchema>;
