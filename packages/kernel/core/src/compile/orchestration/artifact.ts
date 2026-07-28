import type {
  CompileArtifact,
  CompileOccurrenceLocator,
  CompositeCompileArtifact,
  NodeLayoutCompileArtifact,
} from '../types';

/** 创建递归冻结的 occurrence locator */
export const freezeOccurrence = (occurrence: CompileOccurrenceLocator): CompileOccurrenceLocator =>
  Object.freeze({
    sourcePath: occurrence.sourcePath,
    expansionPath: Object.freeze(
      occurrence.expansionPath.map(segment => Object.freeze({ kind: segment.kind, index: segment.index })),
    ),
  });

/** 冻结完整 artifact envelope */
export const freezeCompileArtifact = <T extends CompositeCompileArtifact | NodeLayoutCompileArtifact>(
  artifact: T,
): T => {
  Object.freeze(artifact.value);
  return Object.freeze({
    ...artifact,
    occurrence: freezeOccurrence(artifact.occurrence),
  }) as T;
};

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
  const leftIndexes = left.expansionPath.map(segment => segment.index);
  const rightIndexes = right.expansionPath.map(segment => segment.index);
  return compareIndexes(leftIndexes, rightIndexes);
};

/** 按最终逻辑树 occurrence preorder 排列 compile artifacts */
export const orderCompileArtifacts = (artifacts: ReadonlyArray<CompileArtifact>): Array<CompileArtifact> =>
  artifacts
    .map((artifact, index) => ({ artifact, index }))
    .sort(
      (left, right) =>
        compareCompileOccurrences(left.artifact.occurrence, right.artifact.occurrence) || left.index - right.index,
    )
    .map(({ artifact }) => artifact);
