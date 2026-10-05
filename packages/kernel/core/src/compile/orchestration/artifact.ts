import type { CompileOccurrenceLocator } from '../../contract';
import { compareCompileOccurrences } from '../../contract';
import type { CompileArtifact, CompositeCompileArtifact, NodeLayoutCompileArtifact } from '../types';

/** 创建递归冻结的 occurrence locator */
export const freezeOccurrence = (occurrence: CompileOccurrenceLocator): CompileOccurrenceLocator =>
  Object.freeze({
    sourcePath: occurrence.sourcePath,
    expansionPath: Object.freeze(
      occurrence.expansionPath.map(segment => Object.freeze({ kind: segment.kind, index: segment.index })),
    ),
  });

/**
 * 冻结完整 artifact envelope
 * @template T 要保留判别信息与产物值关联的编译产物类型
 */
export const freezeCompileArtifact = <T extends CompositeCompileArtifact | NodeLayoutCompileArtifact>(
  artifact: T,
): T => {
  Object.freeze(artifact.value);
  return Object.freeze({
    ...artifact,
    occurrence: freezeOccurrence(artifact.occurrence),
  }) as T;
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
