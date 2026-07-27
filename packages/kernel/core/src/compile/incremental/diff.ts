import type { RuntimeChangeSet, RuntimeIdentity } from '@retikz/runtime';

import { createRuntimeIdentity, runtimeIdentityEquals } from '@retikz/runtime';

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

const findEntry = (
  entries: ReadonlyArray<CoreSnapshotIndexEntry>,
  identity: RuntimeIdentity,
): CoreSnapshotIndexEntry | undefined => entries.find(entry => runtimeIdentityEquals(entry.identity, identity));

/** 校验 update-only hint 是否完整覆盖前后 Snapshot 的稳定实体变化 */
export const coreChangeSetMatchesSnapshots = (
  previous: CoreSnapshotIndexRead,
  next: CoreSnapshotIndexRead,
  changeSet: RuntimeChangeSet<CoreChange>,
): boolean => {
  if (!previous.complete || !next.complete || previous.entries.length !== next.entries.length) return false;
  try {
    for (let index = 0; index < previous.entries.length; index += 1) {
      if (!runtimeIdentityEquals(previous.entries[index].identity, next.entries[index].identity)) return false;
    }
    const changed = previous.entries.filter((entry, index) => {
      const nextEntry = next.entries[index];
      return (
        !runtimeIdentityEquals(entry.identity, nextEntry.identity) ||
        !jsonStructuralEquals(entry.value, nextEntry.value)
      );
    });
    if (changed.length !== changeSet.changes.length) return false;
    const matched = new Set<CoreSnapshotIndexEntry>();
    for (const change of changeSet.changes) {
      if (change.kind !== 'update') return false;
      const previousEntry = findEntry(previous.entries, change.identity);
      const nextEntry = findEntry(next.entries, change.identity);
      if (
        previousEntry === undefined ||
        nextEntry === undefined ||
        matched.has(previousEntry) ||
        jsonStructuralEquals(previousEntry.value, nextEntry.value)
      ) {
        return false;
      }
      matched.add(previousEntry);
    }
    return matched.size === changed.length;
  } catch {
    return false;
  }
};
