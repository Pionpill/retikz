import type { ScenePrimitive } from '../../contract';
import type { IRChild } from '../../schemas';
import { createCompileInvariantError } from '../probe-failure';
import type {
  CompileNamespaceKey,
  CompileProvenanceBinding,
  CompileProvenanceEmission,
  CompileProvenanceOwner,
} from '../provenance';
import type { CompileProvenanceTracker, CompileSemanticOwner } from './types';

/** 为重复使用同一对象的 provider 分离实际图元 occurrence */
const clonePrimitiveOccurrence = (primitive: ScenePrimitive): ScenePrimitive =>
  primitive.type === 'group'
    ? { ...primitive, children: primitive.children.map(clonePrimitiveOccurrence) }
    : { ...primitive };

/** 收集单次编译的来源事实，不判断跨次身份或绑定 revision */
export const createCompileProvenanceTracker = (): CompileProvenanceTracker => {
  const root = Object.freeze({}) as CompileSemanticOwner;
  const owners: Array<CompileProvenanceOwner> = [
    Object.freeze({ key: root, kind: 'root', index: 0, generated: false }),
  ];
  const bindings: Array<CompileProvenanceBinding> = [];
  const frames: Array<CompileNamespaceKey> = [Object.freeze({}) as CompileNamespaceKey];
  const rootNamespace = frames[0];
  const records = new WeakMap<ScenePrimitive, Omit<CompileProvenanceEmission, 'primitivePath'>>();
  const ordinals = new WeakMap<CompileSemanticOwner, Map<string, number>>();

  const register = (name: string, owner: CompileSemanticOwner): void => {
    const namespace = frames.at(-1);
    if (namespace === undefined) throw createCompileInvariantError('Missing compile namespace frame');
    bindings.push(Object.freeze({ namespace, name, owner }));
  };
  const createOwner = (
    child: IRChild,
    index: number,
    parent: CompileSemanticOwner,
    generated: boolean,
  ): CompileSemanticOwner => {
    const key = Object.freeze({}) as CompileSemanticOwner;
    const id =
      !('namespace' in child) && 'id' in child && child.id !== undefined && child.id.length > 0 ? child.id : undefined;
    owners.push(
      Object.freeze({
        key,
        parent,
        kind: 'namespace' in child ? `composite:${child.namespace}:${child.type}` : child.type,
        index,
        generated,
        ...(id === undefined ? {} : { id }),
      }),
    );
    if (id !== undefined) register(id, key);
    return key;
  };
  return {
    root,
    createChildOwners: (children, parent, generated) =>
      children.map((child, index) => createOwner(child, index, parent, generated)),
    createGeneratedOwner: (child, index, parent) => createOwner(child, index, parent, true),
    registerGeneratedIdentity: register,
    pushNamespaceFrame: () => {
      frames.push(Object.freeze({}) as CompileNamespaceKey);
    },
    popNamespaceFrame: () => {
      if (frames.length <= 1) throw createCompileInvariantError('Cannot pop root compile namespace');
      frames.pop();
    },
    rootIdentityRegistrations: () =>
      bindings.filter(binding => binding.namespace === rootNamespace).map(binding => binding.name),
    materializePrimitives: primitives => primitives.map(clonePrimitiveOccurrence),
    recordPrimitives: (primitives, owner, role) => {
      const visit = (primitive: ScenePrimitive): void => {
        if (!records.has(primitive)) {
          const emissionRole = `${role}:${primitive.type}`;
          const ownerOrdinals = ordinals.get(owner) ?? new Map<string, number>();
          const ordinal = ownerOrdinals.get(emissionRole) ?? 0;
          ownerOrdinals.set(emissionRole, ordinal + 1);
          ordinals.set(owner, ownerOrdinals);
          records.set(primitive, { owner, role: emissionRole, ordinal });
        }
        if (primitive.type === 'group') primitive.children.forEach(visit);
      };
      primitives.forEach(visit);
    },
    transferPrimitives: (original, copied) => {
      const transfer = (source: ScenePrimitive, target: ScenePrimitive): void => {
        const record = records.get(source);
        if (record !== undefined) records.set(target, record);
        if (source.type === 'group' && target.type === 'group') {
          source.children.forEach((child, index) => {
            const copy = target.children[index];
            transfer(child, copy);
          });
        }
      };
      original.forEach((source, index) => {
        const target = copied[index];
        transfer(source, target);
      });
    },
    capture: primitives => {
      const emissions: Array<CompileProvenanceEmission> = [];
      const visit = (items: ReadonlyArray<ScenePrimitive>, prefix: ReadonlyArray<number>): void => {
        items.forEach((primitive, index) => {
          const primitivePath = Object.freeze([...prefix, index]);
          const record = records.get(primitive);
          if (record === undefined)
            throw createCompileInvariantError(`Missing compile provenance at ${primitivePath.join('.')}`);
          emissions.push(Object.freeze({ ...record, primitivePath }));
          if (primitive.type === 'group') visit(primitive.children, primitivePath);
        });
      };
      visit(primitives, []);
      return Object.freeze({
        root,
        owners: Object.freeze([...owners]),
        bindings: Object.freeze([...bindings]),
        emissions: Object.freeze(emissions),
      });
    },
  };
};
