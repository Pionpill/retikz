import type { RuntimeChangeSet, RuntimeIdentity } from '@retikz/runtime';

import { createRuntimeIdentity, createRuntimeIdentityIndex, runtimeIdentityEquals } from '@retikz/runtime';

import type { CoreChange } from '../../contract';
import type { IRChild, IRScene } from '../../schemas';

import { CORE_OWNER_KEY } from '../../contract';
import { jsonStructuralEquals } from '../../shared/json';

/** Snapshot Diff 中由 document root 拥有的 Scene 根字段 */
export type CoreSnapshotRootValue = Readonly<Omit<IRScene, 'children'>>;

/** Snapshot Diff 可稳定比较的 Core entity */
export type CoreSnapshotIndexEntry = Readonly<{
  /** canonical Core identity */
  identity: RuntimeIdentity;
  /** 当前 identity 拥有的完整 Core IR value */
  value: CoreSnapshotRootValue | IRChild;
}>;

/** 只供 Core Program 使用的 conservative Snapshot index */
export type CoreSnapshotIndexRead = Readonly<{
  /** 当前切片能否精确校验 change hint */
  complete: boolean;
  /** canonical root order 的稳定实体 */
  entries: ReadonlyArray<CoreSnapshotIndexEntry>;
}>;

/** 从完整 Snapshot 建立保守的 root stable identity index */
export const createCoreSnapshotIndex = (source: Readonly<IRScene>): CoreSnapshotIndexRead => {
  const seenIds = new Set<string>();
  const rootValue: CoreSnapshotRootValue = Object.freeze({
    type: source.type,
    version: source.version,
    ...(source.viewBox === undefined ? {} : { viewBox: source.viewBox }),
    ...(source.animations === undefined ? {} : { animations: source.animations }),
  });
  const entries: Array<CoreSnapshotIndexEntry> = [
    Object.freeze({
      identity: createRuntimeIdentity(CORE_OWNER_KEY, ['root']),
      value: rootValue,
    }),
  ];
  let complete = true;
  for (const child of source.children) {
    if ('namespace' in child || child.type === 'scope' || !('id' in child) || !child.id) {
      complete = false;
      continue;
    }
    if (seenIds.has(child.id)) {
      complete = false;
      continue;
    }
    seenIds.add(child.id);
    entries.push(
      Object.freeze({
        identity: createRuntimeIdentity(CORE_OWNER_KEY, ['root', child.type, child.id]),
        value: child,
      }),
    );
  }
  return Object.freeze({ complete, entries: Object.freeze(entries) });
};

type CoreSnapshotEntryLookup = Readonly<{
  root: CoreSnapshotIndexEntry;
  childrenById: ReadonlyMap<string, CoreSnapshotIndexEntry>;
}>;

/** 为 stable-root index 建立不编码 identity path 的常数时间定位表 */
const createSnapshotEntryLookup = (index: CoreSnapshotIndexRead): CoreSnapshotEntryLookup | undefined => {
  const root = index.entries[0];
  const childrenById = new Map<string, CoreSnapshotIndexEntry>();
  for (const entry of index.entries.slice(1)) {
    const id = entry.identity.path.length === 3 ? entry.identity.path[2] : undefined;
    if (id === undefined || childrenById.has(id)) return undefined;
    childrenById.set(id, entry);
  }
  return { root, childrenById };
};

/** 先按 canonical child id 定位，再用 Runtime identity equality 确认完整 path */
const lookupSnapshotEntry = (
  lookup: CoreSnapshotEntryLookup,
  identity: RuntimeIdentity,
): CoreSnapshotIndexEntry | undefined => {
  if (runtimeIdentityEquals(lookup.root.identity, identity)) return lookup.root;
  const id = identity.path.length === 3 ? identity.path[2] : undefined;
  if (id === undefined) return undefined;
  const entry = lookup.childrenById.get(id);
  return entry !== undefined && runtimeIdentityEquals(entry.identity, identity) ? entry : undefined;
};

/** 计算唯一位置序列的严格最长递增子序列长度 */
const longestIncreasingSubsequenceLength = (positions: ReadonlyArray<number>): number => {
  const tails: Array<number> = [];
  for (const position of positions) {
    let start = 0;
    let end = tails.length;
    while (start < end) {
      const middle = Math.floor((start + end) / 2);
      if (tails[middle] < position) start = middle + 1;
      else end = middle;
    }
    tails[start] = position;
  }
  return tails.length;
};

/** 比较两组 stable-root entry 的 identity 顺序 */
const sameIdentityOrder = (
  left: ReadonlyArray<CoreSnapshotIndexEntry>,
  right: ReadonlyArray<CoreSnapshotIndexEntry>,
): boolean =>
  left.length === right.length &&
  left.every((entry, index) => runtimeIdentityEquals(entry.identity, right[index].identity));

/** 比较 before identity，并区分双方都缺省与单侧缺省 */
const sameOptionalIdentity = (left: RuntimeIdentity | undefined, right: RuntimeIdentity | undefined): boolean =>
  left === undefined || right === undefined
    ? left === undefined && right === undefined
    : runtimeIdentityEquals(left, right);

/** 在运行时拒绝 TypeScript 联合类型之外的 change kind */
const hasKnownCoreChangeKind = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null || !('kind' in value)) return false;
  return value.kind === 'add' || value.kind === 'update' || value.kind === 'remove' || value.kind === 'move';
};

/** 校验 stable-root hint 是否完整解释前后 Snapshot 的结构与 value 变化 */
export const coreChangeSetMatchesSnapshots = (
  previous: CoreSnapshotIndexRead,
  next: CoreSnapshotIndexRead,
  changeSet: RuntimeChangeSet<CoreChange>,
): boolean => {
  if (!previous.complete || !next.complete) return false;
  try {
    const rootIdentity = createRuntimeIdentity(CORE_OWNER_KEY, ['root']);
    const previousLookup = createSnapshotEntryLookup(previous);
    const nextLookup = createSnapshotEntryLookup(next);
    if (
      previousLookup === undefined ||
      nextLookup === undefined ||
      !runtimeIdentityEquals(previousLookup.root.identity, rootIdentity) ||
      !runtimeIdentityEquals(nextLookup.root.identity, rootIdentity)
    ) {
      return false;
    }

    const previousChildren = previous.entries.slice(1);
    const nextChildren = next.entries.slice(1);
    const previousIdentities = createRuntimeIdentityIndex(
      CORE_OWNER_KEY,
      previous.entries.map(entry => entry.identity),
    );
    const nextIdentities = createRuntimeIdentityIndex(
      CORE_OWNER_KEY,
      next.entries.map(entry => entry.identity),
    );
    const matchedUpdates = new Set<CoreSnapshotIndexEntry>();
    const added = new Set<CoreSnapshotIndexEntry>();
    const removed = new Set<CoreSnapshotIndexEntry>();
    const movedPrevious = new Set<CoreSnapshotIndexEntry>();
    const movedNext = new Set<CoreSnapshotIndexEntry>();
    const previousCommon = previousChildren.filter(entry => nextIdentities.has(entry.identity));
    const nextCommon = nextChildren.filter(entry => previousIdentities.has(entry.identity));
    const nextPositions = new Map(nextChildren.map((entry, index) => [entry, index]));
    const previousCommonPositions = new Map(previousCommon.map((entry, index) => [entry, index]));
    const previousPositionsInNextOrder: Array<number> = [];
    for (const entry of nextCommon) {
      const previousEntry = lookupSnapshotEntry(previousLookup, entry.identity);
      if (previousEntry === undefined) return false;
      const previousPosition = previousCommonPositions.get(previousEntry);
      if (previousPosition === undefined) return false;
      previousPositionsInNextOrder.push(previousPosition);
    }
    const minimumMoveCount = previousCommon.length - longestIncreasingSubsequenceLength(previousPositionsInNextOrder);

    for (const change of changeSet.changes) {
      if (!hasKnownCoreChangeKind(change)) return false;
      if (change.kind === 'update') {
        const previousEntry = lookupSnapshotEntry(previousLookup, change.identity);
        const nextEntry = lookupSnapshotEntry(nextLookup, change.identity);
        if (
          previousEntry === undefined ||
          nextEntry === undefined ||
          matchedUpdates.has(previousEntry) ||
          jsonStructuralEquals(previousEntry.value, nextEntry.value)
        ) {
          return false;
        }
        matchedUpdates.add(previousEntry);
        continue;
      }

      if (change.kind === 'remove') {
        const previousEntry = lookupSnapshotEntry(previousLookup, change.identity);
        if (
          runtimeIdentityEquals(change.identity, rootIdentity) ||
          previousEntry === undefined ||
          lookupSnapshotEntry(nextLookup, change.identity) !== undefined ||
          removed.has(previousEntry)
        ) {
          return false;
        }
        removed.add(previousEntry);
        continue;
      }

      if (change.kind === 'add') {
        const nextEntry = lookupSnapshotEntry(nextLookup, change.identity);
        if (
          runtimeIdentityEquals(change.identity, rootIdentity) ||
          !runtimeIdentityEquals(change.parent, rootIdentity) ||
          lookupSnapshotEntry(previousLookup, change.identity) !== undefined ||
          nextEntry === undefined ||
          added.has(nextEntry)
        ) {
          return false;
        }
        const nextIndex = nextPositions.get(nextEntry);
        if (nextIndex === undefined) return false;
        const expectedBefore = nextChildren[nextIndex + 1]?.identity;
        if (!sameOptionalIdentity(change.before, expectedBefore)) return false;
        added.add(nextEntry);
        continue;
      }

      const previousEntry = lookupSnapshotEntry(previousLookup, change.identity);
      const nextEntry = lookupSnapshotEntry(nextLookup, change.identity);
      if (
        runtimeIdentityEquals(change.identity, rootIdentity) ||
        !runtimeIdentityEquals(change.parent, rootIdentity) ||
        previousEntry === undefined ||
        nextEntry === undefined ||
        movedPrevious.has(previousEntry)
      ) {
        return false;
      }
      const nextIndex = nextPositions.get(nextEntry);
      if (nextIndex === undefined) return false;
      const expectedBefore = nextChildren[nextIndex + 1]?.identity;
      if (!sameOptionalIdentity(change.before, expectedBefore)) return false;
      movedPrevious.add(previousEntry);
      movedNext.add(nextEntry);
    }

    const expectedAdded = nextChildren.filter(entry => !previousIdentities.has(entry.identity));
    const expectedRemoved = previousChildren.filter(entry => !nextIdentities.has(entry.identity));
    if (
      expectedAdded.length !== added.size ||
      !expectedAdded.every(entry => added.has(entry)) ||
      expectedRemoved.length !== removed.size ||
      !expectedRemoved.every(entry => removed.has(entry))
    ) {
      return false;
    }
    if (movedPrevious.size !== minimumMoveCount) return false;
    const unmovedPrevious = previousCommon.filter(entry => !movedPrevious.has(entry));
    const unmovedNext = nextCommon.filter(entry => !movedNext.has(entry));
    if (!sameIdentityOrder(unmovedPrevious, unmovedNext)) return false;
    const changedValues = previous.entries.filter(entry => {
      const nextEntry = lookupSnapshotEntry(nextLookup, entry.identity);
      return nextEntry !== undefined && !jsonStructuralEquals(entry.value, nextEntry.value);
    });
    return matchedUpdates.size === changedValues.length && changedValues.every(entry => matchedUpdates.has(entry));
  } catch {
    return false;
  }
};
