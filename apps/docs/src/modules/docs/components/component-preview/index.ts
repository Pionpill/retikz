export type { ComponentPreviewProps } from './ComponentPreview';
export { ComponentPreview } from './ComponentPreview';
export type { ComponentRenderProps } from './ComponentRender';
export { ComponentRender } from './ComponentRender';
export { usePreviewActionValue } from './context';
export type {
  ComponentRenderSource,
  DiffLineKind,
  PreviewAction,
  PreviewActionContext,
  PreviewOverlay,
} from './types';
// formatIR 跨用：MDX 内 ComponentPreview 自用 + AI 侧 RetikzPreview 派生 IR JSON
export { availableSourceViews, formatIR } from './utils';
