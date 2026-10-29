import type { CompileNamespaceKey, CompileOwnerKey, CompileProvenance } from '@retikz/core';
import { encodePropertyPath } from '@retikz/foundation';

import { CORE_SOURCE_KEY } from '../constants';
import { createSceneIdentity } from './identity-value';
import type { SceneIdentity, SceneRevision } from './identity-value';

/** 从单次编译来源计算当前候选版本的图元身份 */
export const createPrimitiveIdentityIndex = (
  provenance: CompileProvenance,
  revision: SceneRevision,
): ReadonlyMap<string, Readonly<{ identity: SceneIdentity; semanticOwner: SceneIdentity }>> => {
  const candidates = new Set<CompileOwnerKey>();
  const namespaces = new Map<CompileNamespaceKey, Map<string, Array<CompileOwnerKey>>>();
  for (const binding of provenance.bindings) {
    let names = namespaces.get(binding.namespace);
    if (names === undefined) {
      names = new Map();
      namespaces.set(binding.namespace, names);
    }
    const occurrences = names.get(binding.name) ?? [];
    occurrences.push(binding.owner);
    names.set(binding.name, occurrences);
  }
  for (const names of namespaces.values()) {
    for (const occurrences of names.values()) {
      if (occurrences.length > 1) occurrences.forEach(owner => candidates.add(owner));
    }
  }
  const identities = new Map<CompileOwnerKey, SceneIdentity>();
  const owners = new Map(provenance.owners.map(owner => [owner.key, owner]));
  const identityOf = (key: CompileOwnerKey): SceneIdentity => {
    const cached = identities.get(key);
    if (cached !== undefined) return cached;
    const owner = owners.get(key)!;
    const parent = owner.parent === undefined ? undefined : identityOf(owner.parent);
    const path =
      parent === undefined
        ? ['root']
        : owner.generated || owner.id === undefined || candidates.has(owner.key)
          ? [...parent.path, 'candidate', String(revision), owner.kind, String(owner.index)]
          : [...parent.path, owner.kind, owner.id];
    const identity = createSceneIdentity(CORE_SOURCE_KEY, path);
    identities.set(key, identity);
    return identity;
  };
  const result = new Map<string, Readonly<{ identity: SceneIdentity; semanticOwner: SceneIdentity }>>();
  for (const emission of provenance.emissions) {
    const semanticOwner = identityOf(emission.owner);
    result.set(encodePropertyPath(emission.primitivePath), {
      semanticOwner,
      identity: createSceneIdentity(CORE_SOURCE_KEY, [
        ...semanticOwner.path,
        'emission',
        emission.role,
        String(emission.ordinal),
      ]),
    });
  }
  return result;
};
