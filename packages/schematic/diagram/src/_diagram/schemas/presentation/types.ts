import type { infer as ZodInfer } from 'zod';

import type { DiagramPresentationSchema, DiagramPresentationTextSchema } from './schema';

/** Diagram Presentation 文本区域的持久化 IR */
export type IRDiagramPresentationText = ZodInfer<typeof DiagramPresentationTextSchema>;

/** Diagram Presentation 持久化 IR */
export type IRDiagramPresentation = ZodInfer<typeof DiagramPresentationSchema>;
