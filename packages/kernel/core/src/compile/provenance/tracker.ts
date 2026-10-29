import { formatPropertyPath, readPropertyPath } from '@retikz/foundation';
import type { PropertyPath } from '@retikz/foundation';

import type { ScenePrimitive } from '../../contract';
import type { IRChild } from '../../schemas';
import { createCompileInvariantError } from '../probe-failure';
import type {
  CompileNamespaceKey,
  CompileOwnerKey,
  CompileProvenance,
  CompileProvenanceEmission,
  CompileProvenanceOwner,
} from './types';

/** 收集单次编译的来源事实，不判断跨次身份或绑定 revision */
export class CompileProvenanceTracker {
  /** 文档根身份 */
  readonly root = Object.freeze({}) as CompileOwnerKey;

  /** 按实体键存储来源事实，最终图元路径由 capture 生成 */
  private readonly ownerMap = new Map<CompileOwnerKey, Omit<CompileProvenanceOwner, 'emissions'>>();

  /** 图元对象对应的来源记录，复制时转移，capture 时补全最终路径 */
  private readonly primitiveRecordMap = new WeakMap<
    ScenePrimitive,
    Readonly<{ owner: CompileOwnerKey; role: string; ordinal: number }>
  >();

  /** 同次收集内各实体按发射角色递增的序号 */
  private readonly ordinalMap = new Map<CompileOwnerKey, Map<string, number>>();

  constructor(
    /** 本次来源根所在的作用域身份 */
    readonly rootNamespace: CompileNamespaceKey = Object.freeze({}) as CompileNamespaceKey,
  ) {
    this.ownerMap.set(this.root, { kind: 'root', index: 0, generated: false, namespace: rootNamespace });
  }

  /** 为重复使用同一对象的 provider 分离实际图元 occurrence */
  materializePrimitives(primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> {
    const clonePrimitive = (primitive: ScenePrimitive): ScenePrimitive =>
      primitive.type === 'group'
        ? { ...primitive, children: primitive.children.map(clonePrimitive) }
        : { ...primitive };
    return primitives.map(clonePrimitive);
  }

  /** 记录实体产生的图元树，不覆盖已登记的后代来源 */
  recordPrimitives(primitives: ReadonlyArray<ScenePrimitive>, owner: CompileOwnerKey, role: string): void {
    const visit = (primitive: ScenePrimitive): void => {
      if (!this.primitiveRecordMap.has(primitive)) {
        const emissionRole = `${role}:${primitive.type}`;
        let roleOrdinalMap = this.ordinalMap.get(owner);
        if (roleOrdinalMap === undefined) {
          roleOrdinalMap = new Map();
          this.ordinalMap.set(owner, roleOrdinalMap);
        }
        const ordinal = roleOrdinalMap.get(emissionRole) ?? 0;
        roleOrdinalMap.set(emissionRole, ordinal + 1);
        this.primitiveRecordMap.set(primitive, { owner, role: emissionRole, ordinal });
      }
      if (primitive.type === 'group') primitive.children.forEach(visit);
    };
    primitives.forEach(visit);
  }

  /** 将同构复制的来源转移到新图元 */
  transferPrimitives(original: ReadonlyArray<ScenePrimitive>, copied: ReadonlyArray<ScenePrimitive>): void {
    const transfer = (source: ScenePrimitive, target: ScenePrimitive): void => {
      const record = this.primitiveRecordMap.get(source);
      if (record !== undefined) this.primitiveRecordMap.set(target, record);
      if (source.type === 'group' && target.type === 'group') {
        source.children.forEach((child, index) => transfer(child, target.children[index]));
      }
    };
    original.forEach((source, index) => transfer(source, copied[index]));
  }

  /** 将选中试算的来源挂到当前实体，图元必须与试算快照保持同构且尚未添加外层包装 */
  importProvenance(
    provenance: CompileProvenance,
    primitives: ReadonlyArray<ScenePrimitive>,
    parent: CompileOwnerKey,
    index: number,
    targetNamespace: CompileNamespaceKey,
  ): void {
    /** 仅在此次导入中映射实体键；试算根由提交位置的父实体替代 */
    const ownerKeyMap = new Map<CompileOwnerKey, CompileOwnerKey>([[provenance.root, parent]]);
    /** 试算根命名空间接入当前空间，其余局部空间每次导入独立分配 */
    const namespaceKeyMap = new Map<CompileNamespaceKey, CompileNamespaceKey>([
      [provenance.ownerMap.get(provenance.root)!.namespace, targetNamespace],
    ]);
    for (const key of provenance.ownerMap.keys()) {
      if (key !== provenance.root) ownerKeyMap.set(key, Object.freeze({}) as CompileOwnerKey);
    }

    for (const [sourceKey, sourceOwner] of provenance.ownerMap) {
      if (sourceKey === provenance.root) continue;
      let namespace = namespaceKeyMap.get(sourceOwner.namespace);
      if (namespace === undefined) {
        namespace = Object.freeze({}) as CompileNamespaceKey;
        namespaceKeyMap.set(sourceOwner.namespace, namespace);
      }
      const ownerKey = ownerKeyMap.get(sourceKey)!;
      const { emissions, ...owner } = sourceOwner;
      this.ownerMap.set(ownerKey, {
        ...owner,
        parent: ownerKeyMap.get(sourceOwner.parent!)!,
        namespace,
        index: sourceOwner.parent === provenance.root ? index : sourceOwner.index,
        generated: true,
      });

      for (const emission of emissions) {
        // 路径来自同次 capture；资源重映射只改变字段值，不改变图元树结构
        const primitive = readPropertyPath({ primitives }, emission.primitivePath) as ScenePrimitive | undefined;
        if (primitive === undefined)
          throw createCompileInvariantError(
            `Missing replay primitive at ${formatPropertyPath(emission.primitivePath)}`,
          );
        this.primitiveRecordMap.set(primitive, { owner: ownerKey, role: emission.role, ordinal: emission.ordinal });
        let roleOrdinalMap = this.ordinalMap.get(ownerKey);
        if (roleOrdinalMap === undefined) {
          roleOrdinalMap = new Map();
          this.ordinalMap.set(ownerKey, roleOrdinalMap);
        }
        roleOrdinalMap.set(emission.role, Math.max(roleOrdinalMap.get(emission.role) ?? 0, emission.ordinal + 1));
      }
    }
  }

  /** 按最终 Scene 位置生成独立快照，后续收集不修改已交付结果 */
  capture(primitives: ReadonlyArray<ScenePrimitive>): CompileProvenance {
    /** 当前快照按来源聚合图元，保留没有发射图元的实体 */
    const ownerMap = new Map<
      CompileOwnerKey,
      Omit<CompileProvenanceOwner, 'emissions'> & { emissions: Array<CompileProvenanceEmission> }
    >();
    for (const [key, owner] of this.ownerMap) ownerMap.set(key, { ...owner, emissions: [] });

    const visit = (items: ReadonlyArray<ScenePrimitive>, prefix: PropertyPath): void => {
      items.forEach((primitive, index) => {
        const primitivePath = Object.freeze([...prefix, index]);
        const record = this.primitiveRecordMap.get(primitive);
        if (record === undefined)
          throw createCompileInvariantError(`Missing compile provenance at ${formatPropertyPath(primitivePath)}`);
        const owner = ownerMap.get(record.owner);
        if (owner === undefined) throw createCompileInvariantError('Missing compile provenance owner');
        owner.emissions.push(Object.freeze({ primitivePath, role: record.role, ordinal: record.ordinal }));
        if (primitive.type === 'group') visit(primitive.children, [...primitivePath, 'children']);
      });
    };
    visit(primitives, ['primitives']);
    for (const owner of ownerMap.values()) {
      Object.freeze(owner.emissions);
      Object.freeze(owner);
    }

    return Object.freeze({ root: this.root, ownerMap });
  }

  /** 记录单次输入出现的来源，重复 IR 引用仍分配独立键 */
  createOwner(
    child: IRChild,
    index: number,
    parent: CompileOwnerKey,
    generated: boolean,
    namespace: CompileNamespaceKey,
  ): CompileOwnerKey {
    const key = Object.freeze({}) as CompileOwnerKey;
    const id =
      !('namespace' in child) && 'id' in child && child.id !== undefined && child.id.length > 0 ? child.id : undefined;
    this.ownerMap.set(
      key,
      Object.freeze({
        parent,
        kind: 'namespace' in child ? `composite:${child.namespace}:${child.type}` : child.type,
        index,
        generated,
        namespace,
        ...(id === undefined ? {} : { id }),
      }),
    );
    return key;
  }
}
