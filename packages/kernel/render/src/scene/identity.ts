import { assertNonEmptyString, formatPropertyPath, readPropertyPath } from '@retikz/foundation';
import type { PropertyPath } from '@retikz/foundation';
import type { CompileNamespaceKey, CompileOwnerKey, CompileProvenanceSnapshot } from '@retikz/reconciler';

import { RetikzRenderError, RetikzRenderErrorCode } from '../error';
import { CORE_SOURCE_KEY } from './constants';
import type { RuntimeScenePrimitive } from './types';

/** 从单次编译来源计算当前候选版本的图元身份 */
export const createPrimitiveIdentityIndex = (
  primitives: ReadonlyArray<RuntimeScenePrimitive>,
  provenance: CompileProvenanceSnapshot,
  revision: number,
): WeakMap<
  RuntimeScenePrimitive,
  Readonly<{ identity: SceneIdentity; semanticOwner: SceneIdentity; primitivePath: PropertyPath }>
> => {
  const candidates = new Set<CompileOwnerKey>();
  /** 每个作用域只记录名称的首次出现，遇到重复时将双方标为候选身份 */
  const namespaces = new Map<CompileNamespaceKey, Map<string, CompileOwnerKey>>();
  for (const [ownerKey, owner] of provenance.ownerMap) {
    if (owner.id === undefined) continue;
    let names = namespaces.get(owner.namespace);
    if (names === undefined) {
      names = new Map();
      namespaces.set(owner.namespace, names);
    }
    const firstOwner = names.get(owner.id);
    if (firstOwner === undefined) names.set(owner.id, ownerKey);
    else {
      candidates.add(firstOwner);
      candidates.add(ownerKey);
    }
  }
  const identities = new Map<CompileOwnerKey, SceneIdentity>();
  const identityOf = (key: CompileOwnerKey): SceneIdentity => {
    const cached = identities.get(key);
    if (cached !== undefined) return cached;
    const owner = provenance.ownerMap.get(key)!;
    const parent = owner.parent === undefined ? undefined : identityOf(owner.parent);
    const path =
      parent === undefined
        ? ['root']
        : owner.generated || owner.id === undefined || candidates.has(key)
          ? [...parent.path, 'candidate', String(revision), owner.kind, String(owner.index)]
          : [...parent.path, owner.kind, owner.id];
    const identity = createSceneIdentity(CORE_SOURCE_KEY, path);
    identities.set(key, identity);
    return identity;
  };
  const result = new WeakMap<
    RuntimeScenePrimitive,
    Readonly<{ identity: SceneIdentity; semanticOwner: SceneIdentity; primitivePath: PropertyPath }>
  >();
  const source = { primitives };
  for (const [key, owner] of provenance.ownerMap) {
    if (owner.emissions.length === 0) continue;
    const semanticOwner = identityOf(key);
    for (const emission of owner.emissions) {
      const primitive = readPropertyPath(source, emission.primitivePath) as RuntimeScenePrimitive | undefined;
      if (primitive === undefined) {
        throw new RetikzRenderError(
          RetikzRenderErrorCode.SceneTopologyInvalid,
          `Missing provenance primitive at ${formatPropertyPath(emission.primitivePath)}`,
        );
      }
      result.set(primitive, {
        primitivePath: emission.primitivePath,
        semanticOwner,
        identity: createSceneIdentity(CORE_SOURCE_KEY, [
          ...semanticOwner.path,
          'emission',
          emission.role,
          String(emission.ordinal),
        ]),
      });
    }
  }
  return result;
};

type IdentityTrieNode = Readonly<{
  terminal: boolean;
  children: ReadonlyMap<string, IdentityTrieNode>;
}>;

type MutableIdentityTrieNode = {
  terminal: boolean;
  children: Map<string, MutableIdentityTrieNode>;
};

const assertValidIdentity = (owner: string, path: ReadonlyArray<string>): void => {
  assertNonEmptyString(owner, 'Runtime identity owner', () => identityError(owner, owner));
  if (path.length === 0) {
    throw identityError(owner, path);
  }

  for (let index = 0; index < path.length; index += 1) {
    if (!(index in path)) throw identityError(owner, path);
    const segment = path[index];
    assertNonEmptyString(segment, `Runtime identity path segment ${index}`, () => identityError(owner, path));
  }
};

/** 创建 Runtime identity contract 错误 */
const identityError = (owner: string, cause?: unknown): RetikzRenderError =>
  new RetikzRenderError({
    code: RetikzRenderErrorCode.SceneIdentityInvalid,
    message: `${RetikzRenderErrorCode.SceneIdentityInvalid}: invalid runtime identity for owner "${owner}"`,
    details: { owner },
    cause,
  });

/** 复制并冻结一个已满足 Runtime identity 契约的值 */
const copyIdentity = (identity: SceneIdentity): SceneIdentity =>
  Object.freeze({ owner: identity.owner, path: Object.freeze([...identity.path]) });

const comparePaths = (left: SceneIdentity, right: SceneIdentity): number => {
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
 * @throws {RetikzRenderError} owner 或路径不符合身份契约时抛出 SceneIdentityInvalid
 */
export const createSceneIdentity = (owner: string, path: ReadonlyArray<string>): SceneIdentity => {
  assertValidIdentity(owner, path);
  return copyIdentity({ owner, path });
};

/**
 * 按 Source、path 长度与 segment exact equality 比较 identity
 * @param left 要比较的第一个身份
 * @param right 要比较的第二个身份
 * @returns owner 与每个路径段均相等时为 true
 */
export const sceneIdentityEquals = (left: SceneIdentity, right: SceneIdentity): boolean =>
  left.owner === right.owner &&
  left.path.length === right.path.length &&
  left.path.every((segment, index) => segment === right.path[index]);

/**
 * 创建复制输入、验证 Source/唯一性并稳定排序的 identity lookup
 * @param owner 该查询表绑定的非空来源键
 * @param identities 属于同一来源且不重复的合法身份
 * @returns 复制并冻结身份后的查询表；values 按路径顺序返回副本
 * @throws {RetikzRenderError} owner 为空、身份归属不匹配或路径重复时抛出 SceneIdentityInvalid
 */
export const createSceneIdentityLookup = (
  owner: string,
  identities: ReadonlyArray<SceneIdentity>,
): SceneIdentityLookup => {
  assertNonEmptyString(owner, 'Runtime identity lookup owner', () => identityError(owner, owner));
  const root: MutableIdentityTrieNode = { terminal: false, children: new Map() };
  const copied: Array<SceneIdentity> = [];

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

/** 跨提交稳定的 Scene 图元身份 */
export type SceneIdentity = Readonly<{ owner: string; path: ReadonlyArray<string> }>;

/** 经过唯一性校验的图元身份查询 */
export type SceneIdentityLookup = Readonly<{
  owner: string;
  size: number;
  has: (identity: SceneIdentity) => boolean;
  values: () => ReadonlyArray<SceneIdentity>;
}>;
