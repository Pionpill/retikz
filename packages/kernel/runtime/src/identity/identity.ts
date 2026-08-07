import type { RuntimeIdentity, RuntimeIdentityLookup } from './types';

import { RuntimeIdentityError } from '../error';

type IdentityTrieNode = Readonly<{
  terminal: boolean;
  children: ReadonlyMap<string, IdentityTrieNode>;
}>;

type MutableIdentityTrieNode = {
  terminal: boolean;
  children: Map<string, MutableIdentityTrieNode>;
};

const assertNonEmptyString: (value: unknown, owner: string) => asserts value is string = (value, owner) => {
  if (typeof value !== 'string' || value.length === 0) throw new RuntimeIdentityError(owner, value);
};

/** 校验动态 identity 并复制冻结为唯一内部表示 */
const copyIdentity = (candidate: unknown, expectedOwner?: string): RuntimeIdentity => {
  if (typeof candidate !== 'object' || candidate === null || !('owner' in candidate) || !('path' in candidate)) {
    throw new RuntimeIdentityError(expectedOwner ?? '', candidate);
  }
  const { owner, path: candidatePath } = candidate;
  assertNonEmptyString(owner, expectedOwner ?? '');
  if (expectedOwner !== undefined && owner !== expectedOwner) {
    throw new RuntimeIdentityError(expectedOwner, candidate);
  }
  if (!Array.isArray(candidatePath) || candidatePath.length === 0) {
    throw new RuntimeIdentityError(owner, candidatePath);
  }
  const path: Array<string> = [];
  for (let index = 0; index < candidatePath.length; index += 1) {
    if (!(index in candidatePath)) throw new RuntimeIdentityError(owner, candidatePath);
    const segment = candidatePath[index];
    assertNonEmptyString(segment, owner);
    path.push(segment);
  }
  return Object.freeze({ owner, path: Object.freeze(path) });
};

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

/** 创建并冻结一个 validated Runtime identity */
export const createRuntimeIdentity = (owner: string, path: ReadonlyArray<string>): RuntimeIdentity =>
  copyIdentity({ owner, path });

/** 按 owner、path 长度与 segment exact equality 比较 identity */
export const runtimeIdentityEquals = (left: RuntimeIdentity, right: RuntimeIdentity): boolean => {
  const validatedLeft = copyIdentity(left);
  const validatedRight = copyIdentity(right);
  return (
    validatedLeft.owner === validatedRight.owner &&
    validatedLeft.path.length === validatedRight.path.length &&
    validatedLeft.path.every((segment, index) => segment === validatedRight.path[index])
  );
};

/** 创建复制输入、验证 owner/唯一性并稳定排序的 identity lookup */
export const createRuntimeIdentityLookup = (
  owner: string,
  identities: ReadonlyArray<RuntimeIdentity>,
): RuntimeIdentityLookup => {
  assertNonEmptyString(owner, owner);
  if (!Array.isArray(identities)) throw new RuntimeIdentityError(owner, identities);
  const root: MutableIdentityTrieNode = { terminal: false, children: new Map() };
  const copied: Array<RuntimeIdentity> = [];
  for (let index = 0; index < identities.length; index += 1) {
    if (!(index in identities)) throw new RuntimeIdentityError(owner, identities);
    const identity = copyIdentity(identities[index] as RuntimeIdentity, owner);
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
    if (current.terminal) throw new RuntimeIdentityError(owner, identity);
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
      const validated = copyIdentity(identity, owner);
      return findTrieNode(immutableRoot, validated.path)?.terminal === true;
    },
    values: () => Object.freeze([...values]),
  });
};
