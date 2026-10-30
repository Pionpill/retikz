import type { CompileNamespaceKey, CompileOwnerKey, CompileProvenanceSnapshot } from '@retikz/core';
import { formatPropertyPath, readPropertyPath } from '@retikz/foundation';
import type { PropertyPath } from '@retikz/foundation';

import { CORE_SOURCE_KEY } from '../constants';
import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../error';
import { createSceneIdentity } from './identity-value';
import type { SceneIdentity, SceneRevision } from './identity-value';
import type { RuntimeScenePrimitive } from './types';

/** 从单次编译来源计算当前候选版本的图元身份 */
export const createPrimitiveIdentityIndex = (
  primitives: ReadonlyArray<RuntimeScenePrimitive>,
  provenance: CompileProvenanceSnapshot,
  revision: SceneRevision,
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
        throw new RetikzReconcilerError(
          RetikzReconcilerErrorCode.Compile,
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
