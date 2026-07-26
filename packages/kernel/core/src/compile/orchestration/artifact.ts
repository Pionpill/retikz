import type { JsonValue } from '../../schemas';
import type {
  CompileArtifact,
  CompileOccurrenceLocator,
  CompositeCompileArtifact,
  NodeLayoutCompileArtifact,
} from '../types';

/** 递归冻结只由 plain JSON data 组成的值 */
const freezeJson = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    for (const item of value) freezeJson(item);
    Object.freeze(value);
    return value;
  }
  if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) freezeJson(item);
    Object.freeze(value);
    return value;
  }
  return value;
};

/** 校验 JSON-safe plain data 并创建 detached copy */
export const cloneAndFreezeJson = (value: unknown, path = 'artifact'): JsonValue => {
  const seen = new Set<object>();
  const clone = (input: unknown, currentPath: string): JsonValue => {
    if (input === null || typeof input === 'string' || typeof input === 'boolean') return input;
    if (typeof input === 'number') {
      if (!Number.isFinite(input)) throw new Error(`${currentPath} must contain only finite JSON numbers`);
      return input;
    }
    if (typeof input !== 'object') {
      throw new Error(`${currentPath} must be JSON-safe plain data`);
    }
    if (seen.has(input)) throw new Error(`${currentPath} must not contain cyclic references`);
    seen.add(input);
    try {
      if (Array.isArray(input)) {
        return input.map((item, index) => clone(item, `${currentPath}[${index}]`));
      }
      const prototype = Object.getPrototypeOf(input);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new Error(`${currentPath} must contain only plain objects and arrays`);
      }
      if (Object.getOwnPropertySymbols(input).length > 0) {
        throw new Error(`${currentPath} must not contain symbol keys`);
      }
      const output = Object.create(null) as Record<string, JsonValue>;
      for (const [key, item] of Object.entries(input)) {
        output[key] = clone(item, `${currentPath}.${key}`);
      }
      return output;
    } finally {
      seen.delete(input);
    }
  };
  return freezeJson(clone(value, path));
};

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

const compareOccurrences = (left: CompileOccurrenceLocator, right: CompileOccurrenceLocator): number => {
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
        compareOccurrences(left.artifact.occurrence, right.artifact.occurrence) || left.index - right.index,
    )
    .map(({ artifact }) => artifact);
