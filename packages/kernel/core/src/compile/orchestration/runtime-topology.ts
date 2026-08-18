import type { RuntimeIdentity, RuntimeRevision } from '@retikz/runtime';

import { createRuntimeIdentity } from '@retikz/runtime';

import type { ScenePrimitive } from '../../contract';
import type { IRChild } from '../../schemas';
import type { RuntimePrimitiveMetadata, RuntimeSemanticOwner, RuntimeTopologyTracker } from './types';

import { CORE_OWNER_KEY } from '../../contract';
import { RetikzCompileInvariantError } from '../probe-failure';

const rootIdentity = createRuntimeIdentity(CORE_OWNER_KEY, ['root']);

/** 返回 child 的 Kernel kind；Composite 保持 provider key 仅用于 candidate-local identity */
const childKind = (child: IRChild): string =>
  'namespace' in child ? `composite:${child.namespace}:${child.type}` : child.type;

/** 读取 Kernel child 的可选公开 id，Composite payload 不提升为稳定 identity */
const stableIdOf = (child: IRChild): string | undefined => {
  if ('namespace' in child || !('id' in child)) return undefined;
  return child.id !== undefined && child.id.length > 0 ? child.id : undefined;
};

/** 为每个 Scene primitive occurrence 创建独立对象，避免 provider 复用引用混淆 topology */
const clonePrimitiveOccurrence = (primitive: ScenePrimitive): ScenePrimitive =>
  primitive.type === 'group'
    ? { ...primitive, children: primitive.children.map(clonePrimitiveOccurrence) }
    : { ...primitive };

type RuntimeOwnerState = {
  parent?: RuntimeSemanticOwner;
  childKind?: string;
  childType?: string;
  id?: string;
  index?: number;
  candidate: boolean;
};

type PrimitiveEmission = {
  owner: RuntimeSemanticOwner;
  role: string;
  ordinal: number;
};

/** 创建 canonical traversal 使用的 Core Runtime topology tracker */
export const createRuntimeTopologyTracker = (revision: RuntimeRevision): RuntimeTopologyTracker => {
  const primitiveEmissions = new WeakMap<ScenePrimitive, PrimitiveEmission>();
  const ownerStates = new WeakMap<RuntimeSemanticOwner, RuntimeOwnerState>();
  const ownerIdentities = new WeakMap<RuntimeSemanticOwner, RuntimeIdentity>();
  const emissionOrdinals = new WeakMap<RuntimeSemanticOwner, Map<string, number>>();
  const namespaceFrames: Array<Map<string, Array<RuntimeSemanticOwner>>> = [new Map()];

  const createOwnerHandle = (state: RuntimeOwnerState): RuntimeSemanticOwner => {
    const owner = {} as RuntimeSemanticOwner;
    ownerStates.set(owner, state);
    return owner;
  };
  const rootOwner = createOwnerHandle({ candidate: false });

  const stateOf = (owner: RuntimeSemanticOwner): RuntimeOwnerState => {
    const state = ownerStates.get(owner);
    if (state === undefined) throw new RetikzCompileInvariantError('internal: unknown Runtime semantic owner');
    return state;
  };

  const identityOf = (owner: RuntimeSemanticOwner): RuntimeIdentity => {
    const cached = ownerIdentities.get(owner);
    if (cached !== undefined) return cached;
    const state = stateOf(owner);
    const identity =
      state.parent === undefined
        ? rootIdentity
        : state.candidate || state.id === undefined || state.childType === undefined
          ? createRuntimeIdentity(CORE_OWNER_KEY, [
              ...identityOf(state.parent).path,
              'candidate',
              String(revision),
              state.childKind ?? 'child',
              String(state.index ?? 0),
            ])
          : createRuntimeIdentity(CORE_OWNER_KEY, [...identityOf(state.parent).path, state.childType, state.id]);
    ownerIdentities.set(owner, identity);
    return identity;
  };

  const registerIdentity = (id: string, owner: RuntimeSemanticOwner): void => {
    const frame = namespaceFrames.at(-1);
    if (frame === undefined) throw new RetikzCompileInvariantError('internal: Runtime namespace frame stack is empty');
    const occurrences = frame.get(id) ?? [];
    occurrences.push(owner);
    frame.set(id, occurrences);
    if (occurrences.length > 1) occurrences.forEach(occurrence => (stateOf(occurrence).candidate = true));
  };

  const createChildOwner = (
    child: IRChild,
    index: number,
    parent: RuntimeSemanticOwner,
    generated: boolean,
  ): RuntimeSemanticOwner => {
    const id = stableIdOf(child);
    const owner = createOwnerHandle({
      parent,
      childKind: childKind(child),
      ...(!('namespace' in child) ? { childType: child.type } : {}),
      ...(id === undefined ? {} : { id }),
      index,
      candidate: generated || id === undefined,
    });
    if (id !== undefined) registerIdentity(id, owner);
    return owner;
  };

  const createChildOwners = (
    children: ReadonlyArray<IRChild>,
    parent: RuntimeSemanticOwner,
    generated: boolean,
  ): ReadonlyArray<RuntimeSemanticOwner> =>
    children.map((child, index) => createChildOwner(child, index, parent, generated));

  const recordPrimitives = (
    primitives: ReadonlyArray<ScenePrimitive>,
    owner: RuntimeSemanticOwner,
    role: string,
  ): void => {
    const visit = (primitive: ScenePrimitive): void => {
      if (!primitiveEmissions.has(primitive)) {
        const emissionRole = `${role}:${primitive.type}`;
        const ownerOrdinals = emissionOrdinals.get(owner) ?? new Map<string, number>();
        const ordinal = ownerOrdinals.get(emissionRole) ?? 0;
        ownerOrdinals.set(emissionRole, ordinal + 1);
        emissionOrdinals.set(owner, ownerOrdinals);
        primitiveEmissions.set(primitive, { owner, role: emissionRole, ordinal });
      }
      if (primitive.type === 'group') primitive.children.forEach(visit);
    };
    primitives.forEach(visit);
  };

  return {
    root: rootOwner,
    revision,
    createChildOwners,
    createGeneratedOwner: (child, index, parent) => createChildOwner(child, index, parent, true),
    registerGeneratedIdentity: registerIdentity,
    pushNamespaceFrame: () => namespaceFrames.push(new Map()),
    popNamespaceFrame: () => {
      if (namespaceFrames.length <= 1) {
        throw new RetikzCompileInvariantError('internal: cannot pop Runtime root namespace frame');
      }
      namespaceFrames.pop();
    },
    rootIdentityRegistrations: () => [...namespaceFrames[0]].flatMap(([id, occurrences]) => occurrences.map(() => id)),
    materializePrimitives: primitives => primitives.map(clonePrimitiveOccurrence),
    recordPrimitives,
    metadata: {
      get: (primitive: ScenePrimitive): RuntimePrimitiveMetadata | undefined => {
        const emission = primitiveEmissions.get(primitive);
        if (emission === undefined) return undefined;
        const semanticOwner = identityOf(emission.owner);
        return {
          identity: createRuntimeIdentity(CORE_OWNER_KEY, [
            ...semanticOwner.path,
            'emission',
            emission.role,
            String(emission.ordinal),
          ]),
          semanticOwner,
        };
      },
    },
  };
};
