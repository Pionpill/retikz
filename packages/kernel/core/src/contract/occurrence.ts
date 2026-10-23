import type { ValueOf } from '@retikz/foundation';

/** compile occurrence 展开路径的阶段类别 */
export const CompileExpansionKind = {
  /** provider 输出结果中的 child 序号 */
  Output: 'output',
  /** layout probe 结果中的 child 序号 */
  Probe: 'probe',
  /** replay 结果中的 child 序号 */
  Replay: 'replay',
  /** 生成 scope 子节点中的 child 序号 */
  ScopeChild: 'scopeChild',
  /** 一次逻辑 Clip 应用中的稳定序号 */
  Clip: 'clip',
} as const;

/** compile occurrence 展开路径的阶段类别取值 */
export type CompileExpansionKind = ValueOf<typeof CompileExpansionKind>;

/** compile dispatch、展开与输出相对原始 occurrence 的结构化路径段 */
export type CompileExpansionSegment = Readonly<{
  /** 路径段类别 */
  kind: CompileExpansionKind;
  /** 同类输出中的稳定索引 */
  index: number;
}>;

/** 同一次 canonical compile 内确定的 occurrence locator */
export type CompileOccurrenceLocator = Readonly<{
  /** 最近的原始输入 IR occurrence */
  sourcePath: string;
  /** 从原始 occurrence 到 provider 产物的结构化索引链 */
  expansionPath: ReadonlyArray<CompileExpansionSegment>;
}>;

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
