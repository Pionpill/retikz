import type { infer as ZodInfer } from 'zod';

import type { DiagramThemeSchema } from './schema';

/** Diagram Theme 持久化 IR */
export type IRDiagramTheme = ZodInfer<typeof DiagramThemeSchema>;
