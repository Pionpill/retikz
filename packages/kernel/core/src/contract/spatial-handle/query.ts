import type {
  QualifiedSpatialHandle,
  SpatialHandleIndex,
  SpatialHandleOwner,
  SpatialHandleSelector,
  SpatialOwnerSelector,
} from './types';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { isCompileOccurrenceEqual } from '../occurrence';

const ownerMatches = (owner: SpatialHandleOwner, selector: SpatialOwnerSelector): boolean =>
  owner.namespace === selector.namespace &&
  (selector.type === undefined || owner.type === selector.type) &&
  (selector.instanceId === undefined || owner.instanceId === selector.instanceId) &&
  (selector.occurrence === undefined || isCompileOccurrenceEqual(owner.occurrence, selector.occurrence));

const withinMatches = (
  ancestors: ReadonlyArray<SpatialHandleOwner>,
  selectors: ReadonlyArray<SpatialOwnerSelector>,
): boolean => {
  if (selectors.length === 0) return true;
  if (selectors.length > ancestors.length) return false;
  for (let start = 0; start <= ancestors.length - selectors.length; start += 1) {
    if (selectors.every((selector, index) => ownerMatches(ancestors[start + index], selector))) return true;
  }
  return false;
};

const entryMatches = (entry: QualifiedSpatialHandle, selector: SpatialHandleSelector): boolean => {
  const owner = entry.ownerPath.at(-1);
  if (owner === undefined) return false;
  if (selector.owner !== undefined && !ownerMatches(owner, selector.owner)) return false;
  if (selector.within !== undefined && !withinMatches(entry.ownerPath.slice(0, -1), selector.within)) return false;
  if (selector.key !== undefined && entry.key !== selector.key) return false;
  if (selector.role !== undefined && entry.role !== selector.role) return false;
  if (selector.tags !== undefined && !selector.tags.every(tag => entry.tags.includes(tag))) return false;
  return true;
};

/** 按 closed selector 精确筛选 qualified spatial handles */
export const selectSpatialHandles = (
  index: SpatialHandleIndex,
  selector: SpatialHandleSelector,
): ReadonlyArray<QualifiedSpatialHandle> => Object.freeze(index.entries.filter(entry => entryMatches(entry, selector)));

/** 要求 selector 恰好解析到一个 qualified spatial handle */
export const resolveSpatialHandle = (
  index: SpatialHandleIndex,
  selector: SpatialHandleSelector,
): QualifiedSpatialHandle => {
  const matches = selectSpatialHandles(index, selector);
  const summary = JSON.stringify(selector);
  if (matches.length === 0)
    throw new RetikzCoreError(RetikzCoreErrorCode.Contract, `Spatial handle resolution miss for selector ${summary}.`);
  if (matches.length > 1) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Contract,
      `Spatial handle resolution ambiguity for selector ${summary}; matched ${matches.length} entries.`,
    );
  }
  return matches[0];
};
