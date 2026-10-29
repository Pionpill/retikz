import type { PropertyPath } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';

import type { CompileOccurrenceLocator } from '../contract';

/** 把结构化 occurrence locator 格式化为唯一调试字符串 */
export const formatCompileOccurrence = (locator: CompileOccurrenceLocator): string =>
  formatPropertyPath(locator.sourcePath) +
  locator.expansionPath.map(({ kind, index }) => `::${kind}[${index}]`).join('');

/**
 * 创建声明子元素相对输入根的完整属性路径
 */
export const createCompileChildPath = (prefix: PropertyPath, index: number): PropertyPath => [
  ...prefix,
  'children',
  index,
];
