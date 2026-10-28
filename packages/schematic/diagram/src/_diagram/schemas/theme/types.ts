import type { infer as ZodInfer } from 'zod';

import type { DiagramDefaultsPresentationTextSchema, DiagramDefaultsSchema } from './schema';

/** Diagram defaults 的文本区域片段 */
export type IRDiagramDefaultsPresentationText = ZodInfer<typeof DiagramDefaultsPresentationTextSchema>;

/** Diagram 的 Source-derived 默认片段 */
export type IRDiagramDefaults = ZodInfer<typeof DiagramDefaultsSchema>;
