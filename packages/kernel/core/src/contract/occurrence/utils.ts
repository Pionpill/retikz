import type { CompileOccurrenceLocator } from './types';

/** 判断两个编译 occurrence 是否完全相同 */
export const isCompileOccurrenceEqual = (left: CompileOccurrenceLocator, right: CompileOccurrenceLocator): boolean =>
  left.sourcePath === right.sourcePath &&
  left.expansionPath.length === right.expansionPath.length &&
  left.expansionPath.every(
    (segment, index) =>
      segment.kind === right.expansionPath[index]?.kind && segment.index === right.expansionPath[index]?.index,
  );

const sourceIndexesOf = (sourcePath: string): Array<number> =>
  Array.from(sourcePath.matchAll(/children\[(\d+)\]/g), match => Number(match[1]));

const compareIndexes = (left: ReadonlyArray<number>, right: ReadonlyArray<number>): number => {
  const sharedLength = Math.min(left.length, right.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const difference = left[index] - right[index];
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
};

/** 按 canonical 逻辑树 preorder 比较两个 compile occurrence */
export const compareCompileOccurrences = (left: CompileOccurrenceLocator, right: CompileOccurrenceLocator): number => {
  const sourceDifference = compareIndexes(sourceIndexesOf(left.sourcePath), sourceIndexesOf(right.sourcePath));
  if (sourceDifference !== 0) return sourceDifference;
  return compareIndexes(
    left.expansionPath.map(segment => segment.index),
    right.expansionPath.map(segment => segment.index),
  );
};
