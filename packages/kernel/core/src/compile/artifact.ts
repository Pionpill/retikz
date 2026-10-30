import type { PropertyPath } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';

import type { CompileOccurrenceLocator } from '../contract';
import { compareCompileOccurrences } from '../contract';
import type { CompositeArtifact } from './types';

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

/** 创建递归冻结的 occurrence locator */
export const freezeOccurrence = (occurrence: CompileOccurrenceLocator): CompileOccurrenceLocator =>
  Object.freeze({
    sourcePath: Object.freeze([...occurrence.sourcePath]),
    expansionPath: Object.freeze(
      occurrence.expansionPath.map(segment => Object.freeze({ kind: segment.kind, index: segment.index })),
    ),
  });

/**
 * 冻结完整 artifact envelope
 * @template T 要保留判别信息与产物值关联的编译产物类型
 */
export const freezeCompileArtifact = <T extends CompositeArtifact>(artifact: T): T => {
  Object.freeze(artifact.value);
  return Object.freeze({
    ...artifact,
    occurrence: freezeOccurrence(artifact.occurrence),
  });
};

/** 按最终逻辑树 occurrence preorder 排列 compile artifacts */
export const orderCompileArtifacts = (artifacts: ReadonlyArray<CompositeArtifact>): Array<CompositeArtifact> =>
  [...artifacts].sort((left, right) => compareCompileOccurrences(left.occurrence, right.occurrence));
