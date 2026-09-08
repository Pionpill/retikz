import type { infer as ZodInfer } from 'zod';

import type {
  DiagramPresentationSchema,
  DiagramPresentationTextLayoutSchema,
  DiagramPresentationTextSchema,
  DiagramPresentationTextStyleSchema,
} from './schema';

/** Diagram Presentation 文本区域的持久化 IR */
export type IRDiagramPresentationText = ZodInfer<typeof DiagramPresentationTextSchema>;

/** Diagram Presentation 文本区域的样式覆盖 */
export type IRDiagramPresentationTextStyle = ZodInfer<typeof DiagramPresentationTextStyleSchema>;

/** Diagram Presentation 文本区域的布局覆盖 */
export type IRDiagramPresentationTextLayout = ZodInfer<typeof DiagramPresentationTextLayoutSchema>;

/** Diagram Presentation 持久化 IR */
export type IRDiagramPresentation = ZodInfer<typeof DiagramPresentationSchema>;
