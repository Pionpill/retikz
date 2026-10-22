import type { CompileOccurrenceLocator } from '../contract';
import type { CompositeCompileArtifact, NodeLayoutCompileArtifact } from './types';

/** 把结构化 occurrence locator 格式化为唯一调试字符串 */
export const formatCompileOccurrence = (locator: CompileOccurrenceLocator): string =>
  locator.sourcePath + locator.expansionPath.map(({ kind, index }) => `::${kind}[${index}]`).join('');

/** 判断 compile artifact 是否为真实 Node 的布局产物 */
export const isNodeLayoutCompileArtifact = (
  artifact: CompositeCompileArtifact | NodeLayoutCompileArtifact,
): artifact is NodeLayoutCompileArtifact => artifact.kind === 'nodeLayout';

/**
 * 格式化声明子元素的来源路径；prefix 为空或以点结尾
 * @remarks 基础元素附带 type，Composite 声明不附带类型后缀；路径仅用于来源与诊断
 */
export const formatCompileChildPath = (
  prefix: string,
  index: number,
  type?: 'node' | 'coordinate' | 'path' | 'scope',
): string => `${prefix}children[${index}]${type === undefined ? '' : `.${type}`}`;
