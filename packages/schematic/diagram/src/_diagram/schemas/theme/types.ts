import type { infer as ZodInfer } from 'zod';

import type {
  DiagramDefaultsFrameSchema,
  DiagramDefaultsPresentationSchema,
  DiagramDefaultsPresentationTextSchema,
  DiagramDefaultsSchema,
} from './schema';

/** Diagram defaults 的 Frame 片段 */
export type IRDiagramDefaultsFrame = ZodInfer<typeof DiagramDefaultsFrameSchema>;

/** Diagram defaults 的文本区域片段 */
export type IRDiagramDefaultsPresentationText = ZodInfer<typeof DiagramDefaultsPresentationTextSchema>;

/** Diagram defaults 的 Presentation 片段 */
export type IRDiagramDefaultsPresentation = ZodInfer<typeof DiagramDefaultsPresentationSchema>;

/** Diagram 的 Source-derived 默认片段 */
export type IRDiagramDefaults = ZodInfer<typeof DiagramDefaultsSchema>;
