import type { infer as ZodInfer } from 'zod';

import type { DiagramFrameSchema } from './schema';

/** Diagram Frame 持久化 IR */
export type IRDiagramFrame = ZodInfer<typeof DiagramFrameSchema>;
