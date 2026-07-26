import type { CompileOccurrenceLocator, CompositeCompileArtifact, NodeLayoutCompileArtifact } from './types';

/** 把结构化 occurrence locator 格式化为唯一调试字符串 */
export const formatCompileOccurrence = (locator: CompileOccurrenceLocator): string =>
  locator.sourcePath + locator.expansionPath.map(({ kind, index }) => `::${kind}[${index}]`).join('');

/** 判断 compile artifact 是否为真实 Node 的布局产物 */
export const isNodeLayoutCompileArtifact = (
  artifact: CompositeCompileArtifact | NodeLayoutCompileArtifact,
): artifact is NodeLayoutCompileArtifact => artifact.kind === 'nodeLayout';
