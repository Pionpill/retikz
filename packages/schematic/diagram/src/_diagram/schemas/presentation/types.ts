import type { infer as ZodInfer } from 'zod';

import type { DiagramPresentationSchema } from './schema';

/** Diagram Presentation 持久化 IR */
export type IRDiagramPresentation = ZodInfer<typeof DiagramPresentationSchema>;
