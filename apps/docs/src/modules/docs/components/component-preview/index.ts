export type { ComponentPreviewProps } from './ComponentPreview';
export { ComponentPreview } from './ComponentPreview';
export type { ComponentRenderProps, ComponentRenderSource } from './ComponentRender';
export { ComponentRender } from './ComponentRender';
// formatIR 跨用：MDX 内 ComponentPreview 自用 + AI 侧 RetikzPreview 派生 IR JSON
export { formatIR } from './_shared';
