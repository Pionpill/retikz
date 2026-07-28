import type { RuntimeIdentity } from '@retikz/runtime';

import { createRuntimeIdentityIndex, runtimeIdentityEquals } from '@retikz/runtime';

/** 判断动态值是否为普通对象 */
export const isPlainObject = (value: object): boolean => {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

type RuntimeIdentityMapNode<TValue> = {
  children: Map<string, RuntimeIdentityMapNode<TValue>>;
  entry?: Readonly<{ identity: RuntimeIdentity; value: TValue }>;
};

/** 以结构化 identity path 建立经 Runtime contract 校验的值索引 */
export type RuntimeIdentityMap<TValue> = Readonly<{
  /** 查询 exact identity 对应的值 */
  get: (identity: RuntimeIdentity) => TValue | undefined;
  /** 判断 exact identity 是否已存在 */
  has: (identity: RuntimeIdentity) => boolean;
  /** 写入尚不存在的 exact identity */
  set: (identity: RuntimeIdentity, value: TValue) => boolean;
  /** 删除 exact identity */
  delete: (identity: RuntimeIdentity) => boolean;
}>;

/** 创建不拼接 identity key 的 Runtime identity 值索引 */
export const createRuntimeIdentityMap = <TValue>(
  entries: ReadonlyArray<readonly [RuntimeIdentity, TValue]>,
): RuntimeIdentityMap<TValue> => {
  const roots = new Map<string, RuntimeIdentityMapNode<TValue>>();
  const byOwner = new Map<string, Array<RuntimeIdentity>>();
  for (const [identity] of entries) {
    const identities = byOwner.get(identity.owner) ?? [];
    identities.push(identity);
    byOwner.set(identity.owner, identities);
  }
  for (const [owner, identities] of byOwner) createRuntimeIdentityIndex(owner, identities);

  const locate = (identity: RuntimeIdentity, create: boolean): RuntimeIdentityMapNode<TValue> | undefined => {
    runtimeIdentityEquals(identity, identity);
    const existingRoot = roots.get(identity.owner);
    let current: RuntimeIdentityMapNode<TValue>;
    if (existingRoot === undefined) {
      if (!create) return undefined;
      current = { children: new Map() };
      roots.set(identity.owner, current);
    } else current = existingRoot;
    for (const segment of identity.path) {
      let child: RuntimeIdentityMapNode<TValue> | undefined = current.children.get(segment);
      if (child === undefined) {
        if (!create) return undefined;
        child = { children: new Map() };
        current.children.set(segment, child);
      }
      current = child;
    }
    return current;
  };
  const get = (identity: RuntimeIdentity): TValue | undefined => {
    const entry = locate(identity, false)?.entry;
    return entry !== undefined && runtimeIdentityEquals(entry.identity, identity) ? entry.value : undefined;
  };
  const set = (identity: RuntimeIdentity, value: TValue): boolean => {
    const node = locate(identity, true);
    if (node === undefined || node.entry !== undefined) return false;
    node.entry = Object.freeze({ identity, value });
    return true;
  };
  const remove = (identity: RuntimeIdentity): boolean => {
    const node = locate(identity, false);
    if (node?.entry === undefined || !runtimeIdentityEquals(node.entry.identity, identity)) return false;
    delete node.entry;
    return true;
  };
  for (const [identity, value] of entries) {
    if (!set(identity, value)) throw new Error('Runtime identity map received a duplicate identity');
  }
  return Object.freeze({ get, has: identity => get(identity) !== undefined, set, delete: remove });
};

/** 同一 semantic owner 的公开 id 聚合状态 */
type SemanticOwnerPublicIdState = {
  /** 首个公开 id */
  publicId: string;
  /** 是否观察到相互冲突的公开 id */
  ambiguous: boolean;
};

/**
 * 按 semantic owner 聚合可供匿名 occurrence 继承的唯一公开 id
 * @description 一个 owner 可发射多个 primitive；重复出现同一公开 id 仍视为唯一，冲突 id 则不提供回退
 */
export const createSemanticOwnerPublicIdMap = (
  topology: ReadonlyArray<Readonly<{ semanticOwner: RuntimeIdentity; publicId?: string }>>,
): RuntimeIdentityMap<string> => {
  const stateByOwner = createRuntimeIdentityMap<SemanticOwnerPublicIdState>([]);
  const states: Array<readonly [RuntimeIdentity, SemanticOwnerPublicIdState]> = [];
  for (const node of topology) {
    if (node.publicId === undefined) continue;
    const existing = stateByOwner.get(node.semanticOwner);
    if (existing === undefined) {
      const state = { publicId: node.publicId, ambiguous: false };
      stateByOwner.set(node.semanticOwner, state);
      states.push([node.semanticOwner, state]);
    } else if (existing.publicId !== node.publicId) existing.ambiguous = true;
  }
  return createRuntimeIdentityMap(
    states.flatMap(([identity, state]) => (state.ambiguous ? [] : ([[identity, state.publicId]] as const))),
  );
};

/** 按 effective public id 聚合完整 topology primitive paths */
export const createPublicIdPrimitivePathMap = (
  topology: ReadonlyArray<
    Readonly<{ semanticOwner: RuntimeIdentity; primitivePath: ReadonlyArray<number>; publicId?: string }>
  >,
): ReadonlyMap<string, ReadonlyArray<ReadonlyArray<number>>> => {
  const publicIdByOwner = createSemanticOwnerPublicIdMap(topology);
  const pathsByPublicId = new Map<string, Array<ReadonlyArray<number>>>();
  for (const node of topology) {
    const publicId = node.publicId ?? publicIdByOwner.get(node.semanticOwner);
    if (publicId === undefined) continue;
    const paths = pathsByPublicId.get(publicId) ?? [];
    paths.push(node.primitivePath);
    pathsByPublicId.set(publicId, paths);
  }
  return new Map(Array.from(pathsByPublicId, ([publicId, paths]) => [publicId, Object.freeze(paths.slice())] as const));
};

/** 复制并递归冻结 JSON-like 容器，函数与非普通对象保留稳定 identity */
export const cloneAndFreezeRuntimeValue = <T>(value: T, ancestors = new WeakSet<object>()): T => {
  if (typeof value !== 'object' || value === null) return value;
  if (!Array.isArray(value) && !isPlainObject(value)) return value;
  if (ancestors.has(value)) throw new Error('Render runtime config must not contain cyclic plain data');
  ancestors.add(value);
  let copied: unknown;
  if (Array.isArray(value)) {
    const keys = Reflect.ownKeys(value);
    if (keys.length !== value.length + 1 || keys.some(key => typeof key !== 'string')) {
      throw new Error('Render runtime config arrays must be dense data-property arrays');
    }
    const array: Array<unknown> = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
        throw new Error('Render runtime config arrays must be dense data-property arrays');
      }
      array.push(cloneAndFreezeRuntimeValue(descriptor.value, ancestors));
    }
    copied = array;
  } else {
    const record = Object.create(null) as Record<PropertyKey, unknown>;
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (typeof key !== 'string' || descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
        throw new Error('Render runtime config objects must contain enumerable data properties');
      }
      Object.defineProperty(record, key, {
        value: cloneAndFreezeRuntimeValue(descriptor.value, ancestors),
        enumerable: true,
        configurable: false,
        writable: false,
      });
    }
    copied = record;
  }
  ancestors.delete(value);
  return Object.freeze(copied) as T;
};

/** 比较 Runtime public DTO；函数与非普通对象按 identity 比较 */
export const runtimeStructuralEquals = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
      const leftHasValue = index in left;
      if (leftHasValue !== index in right) return false;
      if (leftHasValue && !runtimeStructuralEquals(left[index], right[index])) return false;
    }
    return true;
  }
  if (!isPlainObject(left) || !isPlainObject(right)) return false;
  const leftKeys = Reflect.ownKeys(left);
  const rightKeys = Reflect.ownKeys(right);
  if (leftKeys.length !== rightKeys.length || leftKeys.some(key => !rightKeys.includes(key))) return false;
  return leftKeys.every(key => runtimeStructuralEquals(Reflect.get(left, key), Reflect.get(right, key)));
};
