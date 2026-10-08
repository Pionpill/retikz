import { assertNonEmptyString } from '@retikz/foundation';

import { RetikzRuntimeError, RetikzRuntimeErrorCode } from '../error';
import type { RuntimeIdentity, RuntimeIdentityLookup } from './types';

type IdentityTrieNode = Readonly<{
  terminal: boolean;
  children: ReadonlyMap<string, IdentityTrieNode>;
}>;

type MutableIdentityTrieNode = {
  terminal: boolean;
  children: Map<string, MutableIdentityTrieNode>;
};

const assertValidIdentity = (owner: string, path: ReadonlyArray<string>): void => {
  assertNonEmptyString(owner, 'Runtime identity owner', identityError(owner, owner));
  if (path.length === 0) {
    throw identityError(owner, path);
  }

  for (let index = 0; index < path.length; index += 1) {
    if (!(index in path)) throw identityError(owner, path);
    const segment = path[index];
    assertNonEmptyString(segment, `Runtime identity path segment ${index}`, identityError(owner, path));
  }
};

/** 创建 Runtime identity contract 错误 */
const identityError = (owner: string, cause?: unknown): RetikzRuntimeError =>
  new RetikzRuntimeError({
    code: RetikzRuntimeErrorCode.IdentityInvalid,
    phase: 'identity',
    message: `${RetikzRuntimeErrorCode.IdentityInvalid}: invalid runtime identity for owner "${owner}"`,
    owner,
    cause,
  });

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

/**
 * 创建并冻结一个 Runtime identity
 * @param owner 所属来源的非空键
 * @param path 至少含一个非空字符串的路径；保留原始大小写与空白
 * @returns 复制并冻结路径后的身份对象
 * @throws {RetikzRuntimeError} owner 或路径不符合身份契约时抛出 IdentityInvalid
 */
export const createRuntimeIdentity = (owner: string, path: ReadonlyArray<string>): RuntimeIdentity => {
  assertValidIdentity(owner, path);
  return copyIdentity({ owner, path });
};

/**
 * 按 Source、path 长度与 segment exact equality 比较 identity
 * @param left 要比较的第一个身份
 * @param right 要比较的第二个身份
 * @returns owner 与每个路径段均相等时为 true
 */
export const runtimeIdentityEquals = (left: RuntimeIdentity, right: RuntimeIdentity): boolean =>
  left.owner === right.owner &&
  left.path.length === right.path.length &&
  left.path.every((segment, index) => segment === right.path[index]);

/**
 * 创建复制输入、验证 Source/唯一性并稳定排序的 identity lookup
 * @param owner 该查询表绑定的非空来源键
 * @param identities 属于同一来源且不重复的合法身份
 * @returns 复制并冻结身份后的查询表；values 按路径顺序返回副本
 * @throws {RetikzRuntimeError} owner 为空、身份归属不匹配或路径重复时抛出 IdentityInvalid
 */
export const createRuntimeIdentityLookup = (
  owner: string,
  identities: ReadonlyArray<RuntimeIdentity>,
): RuntimeIdentityLookup => {
  assertNonEmptyString(owner, 'Runtime identity lookup owner', identityError(owner, owner));
  const root: MutableIdentityTrieNode = { terminal: false, children: new Map() };
  const copied: Array<RuntimeIdentity> = [];

  for (const oriIdentity of identities) {
    if (oriIdentity.owner !== owner) throw identityError(owner, oriIdentity);

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

    if (current.terminal) throw identityError(owner, identity);

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
      if (identity.owner !== owner) throw identityError(owner, identity);
      return findTrieNode(immutableRoot, identity.path)?.terminal === true;
    },
    values: () => Object.freeze([...values]),
  });
};
