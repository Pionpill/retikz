import { assertNonEmptyString as assertFoundationNonEmptyString } from '@retikz/foundation';

import type { RuntimeIdentity, RuntimeIdentityLookup } from './types';

import { RetikzRuntimeIdentityError } from '../error';

type IdentityTrieNode = Readonly<{
  terminal: boolean;
  children: ReadonlyMap<string, IdentityTrieNode>;
}>;

type MutableIdentityTrieNode = {
  terminal: boolean;
  children: Map<string, MutableIdentityTrieNode>;
};

const assertNonEmptyString = (value: string, owner: string): void => {
  try {
    assertFoundationNonEmptyString(value, owner);
  } catch {
    throw new RetikzRuntimeIdentityError(owner, value);
  }
};

const assertValidIdentity = (owner: string, path: ReadonlyArray<string>): void => {
  assertNonEmptyString(owner, owner);
  if (path.length === 0) {
    throw new RetikzRuntimeIdentityError(owner, path);
  }
  for (let index = 0; index < path.length; index += 1) {
    if (!(index in path)) throw new RetikzRuntimeIdentityError(owner, path);
    const segment = path[index];
    assertNonEmptyString(segment, owner);
  }
};

/** 复制并冻结一个已满足 Runtime identity 契约的值 */
const copyIdentity = (identity: RuntimeIdentity): RuntimeIdentity =>
  Object.freeze({ owner: identity.owner, path: Object.freeze([...identity.path]) });

const comparePaths = (left: RuntimeIdentity, right: RuntimeIdentity): number => {
  const length = Math.min(left.path.length, right.path.length);
  for (let index = 0; index < length; index += 1) {
    const leftSegment = left.path[index];
    const rightSegment = right.path[index];
    if (leftSegment < rightSegment) return -1;
    if (leftSegment > rightSegment) return 1;
  }
  return left.path.length - right.path.length;
};

const findTrieNode = (root: IdentityTrieNode, path: ReadonlyArray<string>): IdentityTrieNode | undefined => {
  let current: IdentityTrieNode | undefined = root;
  for (const segment of path) {
    if (current === undefined) return undefined;
    current = current.children.get(segment);
  }
  return current;
};

/** 创建并冻结一个 Runtime identity */
export const createRuntimeIdentity = (owner: string, path: ReadonlyArray<string>): RuntimeIdentity => {
  assertValidIdentity(owner, path);
  return copyIdentity({ owner, path });
};

/** 按 owner、path 长度与 segment exact equality 比较 identity */
export const runtimeIdentityEquals = (left: RuntimeIdentity, right: RuntimeIdentity): boolean =>
  left.owner === right.owner &&
  left.path.length === right.path.length &&
  left.path.every((segment, index) => segment === right.path[index]);

/** 创建复制输入、验证 owner/唯一性并稳定排序的 identity lookup */
export const createRuntimeIdentityLookup = (
  owner: string,
  identities: ReadonlyArray<RuntimeIdentity>,
): RuntimeIdentityLookup => {
  assertNonEmptyString(owner, owner);
  const root: MutableIdentityTrieNode = { terminal: false, children: new Map() };
  const copied: Array<RuntimeIdentity> = [];
  for (const oriIdentity of identities) {
    if (oriIdentity.owner !== owner) throw new RetikzRuntimeIdentityError(owner, oriIdentity);
    const identity = copyIdentity(oriIdentity);
    let current = root;
    for (const segment of identity.path) {
      const existing = current.children.get(segment);
      if (existing !== undefined) current = existing;
      else {
        const child: MutableIdentityTrieNode = { terminal: false, children: new Map() };
        current.children.set(segment, child);
        current = child;
      }
    }
    if (current.terminal) throw new RetikzRuntimeIdentityError(owner, identity);
    current.terminal = true;
    copied.push(identity);
  }
  copied.sort(comparePaths);
  const values = Object.freeze(copied);
  const immutableRoot = root as IdentityTrieNode;
  return Object.freeze({
    owner,
    size: values.length,
    has: identity => {
      if (identity.owner !== owner) throw new RetikzRuntimeIdentityError(owner, identity);
      return findTrieNode(immutableRoot, identity.path)?.terminal === true;
    },
    values: () => Object.freeze([...values]),
  });
};
