import type { z } from 'zod';

import type { ThemeSchema } from './schema';

export type IRTheme = z.infer<typeof ThemeSchema>;
