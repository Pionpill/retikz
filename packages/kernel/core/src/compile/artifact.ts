import type { CompileOccurrenceLocator } from '../contract';

/** 把结构化 occurrence locator 格式化为唯一调试字符串 */
export const formatCompileOccurrence = (locator: CompileOccurrenceLocator): string =>
  locator.sourcePath + locator.expansionPath.map(({ kind, index }) => `::${kind}[${index}]`).join('');

/**
 * 格式化声明子元素的来源路径；prefix 为空或以点结尾
 * @remarks 基础元素附带 type，Composite 声明不附带类型后缀；路径仅用于来源与诊断
 */
export const formatCompileChildPath = (
  prefix: string,
  index: number,
  type?: 'node' | 'coordinate' | 'path' | 'scope',
): string => `${prefix}children[${index}]${type === undefined ? '' : `.${type}`}`;
