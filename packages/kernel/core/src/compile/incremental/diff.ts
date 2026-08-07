import type { RuntimeChangeSet, RuntimeIdentity } from '@retikz/runtime';

import { createRuntimeIdentity, createRuntimeIdentityLookup, runtimeIdentityEquals } from '@retikz/runtime';

import type { CoreChange } from '../../contract';
import type { IRChild, IRScene, IRScope } from '../../schemas';

import { CORE_OWNER_KEY } from '../../contract';
import { jsonStructuralEquals } from '../../shared/json';

/** Snapshot Diff 中由 document root 拥有的 Scene 根字段 */
export type CoreSnapshotRootValue = Readonly<Omit<IRScene, 'children'>>;

/** Snapshot Diff 中由稳定 Scope identity 拥有的自身字段 */
export type CoreSnapshotScopeValue = Readonly<Omit<IRScope, 'children'>>;

/** Snapshot Diff 可稳定比较的 Core entity */
export type CoreSnapshotIndexEntry = Readonly<{
  /** canonical Core identity */
  identity: RuntimeIdentity;
  /** document root 之外实体的稳定父 boundary */
  parent?: RuntimeIdentity;
  /** 当前 identity 拥有的完整 Core IR value */
  value: CoreSnapshotRootValue | CoreSnapshotScopeValue | IRChild;
}>;

/** 只供 Core Program 使用的 conservative Snapshot index */
export type CoreSnapshotIndexRead = Readonly<{
  /** 当前切片能否精确校验 change hint */
  complete: boolean;
  /** canonical preorder 的稳定实体 */
  entries: ReadonlyArray<CoreSnapshotIndexEntry>;
}>;

/** 提取 Scope 自身字段，避免稳定后代变化被误算成父 Scope update */
const createScopeValue = (scope: Readonly<IRScope>): CoreSnapshotScopeValue => {
  const { children, ...value } = scope;
  void children;
  return value;
};

/** 从完整 Snapshot 建立保守的 stable identity tree */
export const createCoreSnapshotIndex = (source: Readonly<IRScene>): CoreSnapshotIndexRead => {
  const rootIdentity = createRuntimeIdentity(CORE_OWNER_KEY, ['root']);
  const rootValue: CoreSnapshotRootValue = {
    type: source.type,
    version: source.version,
    ...(source.theme === undefined ? {} : { theme: source.theme }),
    ...(source.viewBox === undefined ? {} : { viewBox: source.viewBox }),
    ...(source.animations === undefined ? {} : { animations: source.animations }),
  };
  const entries: Array<CoreSnapshotIndexEntry> = [
    {
      identity: rootIdentity,
      value: rootValue,
    },
  ];
  let complete = true;

  const indexChildren = (children: ReadonlyArray<IRChild>, parent: RuntimeIdentity): void => {
    const seenIds = new Set<string>();
    for (const child of children) {
      if ('namespace' in child || !('id' in child) || !child.id || seenIds.has(child.id)) {
        complete = false;
        continue;
      }
      seenIds.add(child.id);
      const identity = createRuntimeIdentity(CORE_OWNER_KEY, [...parent.path, child.type, child.id]);
      entries.push({
        identity,
        parent,
        value: child.type === 'scope' ? createScopeValue(child) : child,
      });
      if (child.type === 'scope') indexChildren(child.children, identity);
    }
  };

  indexChildren(source.children, rootIdentity);
  return { complete, entries };
};

type CoreSnapshotEntryLookup = Readonly<{
  root: CoreSnapshotIndexEntry;
  entriesByPath: ReadonlyMap<string, CoreSnapshotIndexEntry>;
  childrenByParentPath: ReadonlyMap<string, ReadonlyArray<CoreSnapshotIndexEntry>>;
  siblingIndexByPath: ReadonlyMap<string, number>;
}>;

/** 为 validated identity path 建立无碰撞的内部 Map key */
const identityPathKey = (identity: RuntimeIdentity): string => JSON.stringify(identity.path);

/** 为 stable identity tree 建立常数时间定位表与 sibling order */
const createSnapshotEntryLookup = (index: CoreSnapshotIndexRead): CoreSnapshotEntryLookup | undefined => {
  const root = index.entries[0];
  if (root.parent !== undefined) return undefined;
  const entriesByPath = new Map<string, CoreSnapshotIndexEntry>();
  const mutableChildrenByParentPath = new Map<string, Array<CoreSnapshotIndexEntry>>();
  entriesByPath.set(identityPathKey(root.identity), root);
  for (const entry of index.entries.slice(1)) {
    if (entry.parent === undefined) return undefined;
    const key = identityPathKey(entry.identity);
    const parentKey = identityPathKey(entry.parent);
    if (entriesByPath.has(key) || !entriesByPath.has(parentKey)) return undefined;
    entriesByPath.set(key, entry);
    const siblings = mutableChildrenByParentPath.get(parentKey) ?? [];
    siblings.push(entry);
    mutableChildrenByParentPath.set(parentKey, siblings);
  }
  const childrenByParentPath = new Map<string, ReadonlyArray<CoreSnapshotIndexEntry>>();
  const siblingIndexByPath = new Map<string, number>();
  for (const [parentKey, children] of mutableChildrenByParentPath) {
    childrenByParentPath.set(parentKey, children);
    children.forEach((entry, siblingIndex) => siblingIndexByPath.set(identityPathKey(entry.identity), siblingIndex));
  }
  return { root, entriesByPath, childrenByParentPath, siblingIndexByPath };
};

/** 按 canonical path 定位，再用 Runtime identity equality 确认完整 identity */
const lookupSnapshotEntry = (
  lookup: CoreSnapshotEntryLookup,
  identity: RuntimeIdentity,
): CoreSnapshotIndexEntry | undefined => {
  const entry = lookup.entriesByPath.get(identityPathKey(identity));
  return entry !== undefined && runtimeIdentityEquals(entry.identity, identity) ? entry : undefined;
};

/** 返回 parent 在 canonical Snapshot 中的直接稳定 children */
const lookupSnapshotChildren = (
  lookup: CoreSnapshotEntryLookup,
  parent: RuntimeIdentity,
): ReadonlyArray<CoreSnapshotIndexEntry> => lookup.childrenByParentPath.get(identityPathKey(parent)) ?? [];

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

/** 比较两组 stable identity tree entry 的 identity 顺序 */
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

/** 校验 stable identity tree hint 是否完整解释前后 Snapshot 的结构与 value 变化 */
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

    const previousEntities = previous.entries.slice(1);
    const nextEntities = next.entries.slice(1);
    const previousIdentities = createRuntimeIdentityLookup(
      CORE_OWNER_KEY,
      previous.entries.map(entry => entry.identity),
    );
    const nextIdentities = createRuntimeIdentityLookup(
      CORE_OWNER_KEY,
      next.entries.map(entry => entry.identity),
    );
    const matchedUpdates = new Set<CoreSnapshotIndexEntry>();
    const added = new Set<CoreSnapshotIndexEntry>();
    const removed = new Set<CoreSnapshotIndexEntry>();
    const movedPrevious = new Set<CoreSnapshotIndexEntry>();
    const movedNext = new Set<CoreSnapshotIndexEntry>();

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
          lookupSnapshotEntry(previousLookup, change.identity) !== undefined ||
          nextEntry === undefined ||
          nextEntry.parent === undefined ||
          !runtimeIdentityEquals(change.parent, nextEntry.parent) ||
          added.has(nextEntry)
        ) {
          return false;
        }
        const nextSiblings = lookupSnapshotChildren(nextLookup, nextEntry.parent);
        const nextIndex = nextLookup.siblingIndexByPath.get(identityPathKey(nextEntry.identity));
        if (nextIndex === undefined) return false;
        const expectedBefore = nextSiblings[nextIndex + 1]?.identity;
        if (!sameOptionalIdentity(change.before, expectedBefore)) return false;
        added.add(nextEntry);
        continue;
      }

      const previousEntry = lookupSnapshotEntry(previousLookup, change.identity);
      const nextEntry = lookupSnapshotEntry(nextLookup, change.identity);
      if (
        runtimeIdentityEquals(change.identity, rootIdentity) ||
        previousEntry === undefined ||
        nextEntry === undefined ||
        nextEntry.parent === undefined ||
        !runtimeIdentityEquals(change.parent, nextEntry.parent) ||
        movedPrevious.has(previousEntry)
      ) {
        return false;
      }
      const nextSiblings = lookupSnapshotChildren(nextLookup, nextEntry.parent);
      const nextIndex = nextLookup.siblingIndexByPath.get(identityPathKey(nextEntry.identity));
      if (nextIndex === undefined) return false;
      const expectedBefore = nextSiblings[nextIndex + 1]?.identity;
      if (!sameOptionalIdentity(change.before, expectedBefore)) return false;
      movedPrevious.add(previousEntry);
      movedNext.add(nextEntry);
    }

    const expectedAdded = nextEntities.filter(entry => !previousIdentities.has(entry.identity));
    const expectedRemoved = previousEntities.filter(entry => !nextIdentities.has(entry.identity));
    if (
      expectedAdded.length !== added.size ||
      !expectedAdded.every(entry => added.has(entry)) ||
      expectedRemoved.length !== removed.size ||
      !expectedRemoved.every(entry => removed.has(entry))
    ) {
      return false;
    }
    for (const parent of previous.entries) {
      if (!nextIdentities.has(parent.identity)) continue;
      const previousChildren = lookupSnapshotChildren(previousLookup, parent.identity);
      const nextChildren = lookupSnapshotChildren(nextLookup, parent.identity);
      const previousCommon = previousChildren.filter(entry => nextIdentities.has(entry.identity));
      const nextCommon = nextChildren.filter(entry => previousIdentities.has(entry.identity));
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
      const movedPreviousChildren = previousCommon.filter(entry => movedPrevious.has(entry));
      const movedNextChildren = nextCommon.filter(entry => movedNext.has(entry));
      if (movedPreviousChildren.length !== minimumMoveCount || movedNextChildren.length !== minimumMoveCount) {
        return false;
      }
      const unmovedPrevious = previousCommon.filter(entry => !movedPrevious.has(entry));
      const unmovedNext = nextCommon.filter(entry => !movedNext.has(entry));
      if (!sameIdentityOrder(unmovedPrevious, unmovedNext)) return false;
    }
    const changedValues = previous.entries.filter(entry => {
      const nextEntry = lookupSnapshotEntry(nextLookup, entry.identity);
      return nextEntry !== undefined && !jsonStructuralEquals(entry.value, nextEntry.value);
    });
    return matchedUpdates.size === changedValues.length && changedValues.every(entry => matchedUpdates.has(entry));
  } catch {
    return false;
  }
};
