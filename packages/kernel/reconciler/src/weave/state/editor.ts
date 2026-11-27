import { captureCompositeInputScope } from '@retikz/core';
import type { CanonicalScopeInheritance, IRChild } from '@retikz/core';
import type { IdAllocator } from '@retikz/foundation';
import { compareProperties } from '@retikz/foundation';

import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../../error';
import { WeaveOperationKind } from '../shared';
import type {
  WeaveDependencyKind,
  InputWeaveElement,
  WeaveEntry,
  WeaveOperation,
  InputWeaveOwn,
  WeaveRoot,
  WeaveScopeEntry,
  WeaveTarget,
} from '../shared';
import type { WeaveAddressIndex } from './address';
import { WeaveLookup } from './lookup';
import type { WeaveTransaction } from './transaction';

/** 单次声明编辑产生的变化，供协调器安排依赖传播与事务清理 */
type WeaveEditResult = {
  /** 本次声明变化涉及的名称与原/新空间，用于精确更新操作索引 */
  names: Set<string>;
  namespaces: Set<WeaveRoot | WeaveScopeEntry>;
  /** 自身输入或声明成员发生变化的条目，不包含推导的消费者 */
  changedEntries: Array<WeaveEntry>;
  /** 名称声明或命名空间归属变化 */
  indexesChanged: boolean;
  /** 插删改变的容器；仅它的后续子地址需要刷新 */
  structure?: { parent: WeaveRoot | WeaveScopeEntry; index: number };
  /** 新建的全部条目，用于登记编译 binding */
  insertedEntries: Array<WeaveEntry>;
  /** 已脱离候选树的条目，按父先子后排列，依赖断开前仍可读取其状态 */
  removedEntries: Array<WeaveEntry>;
};

/** 编辑候选声明树与寻址索引，不负责依赖传播、Core 编译或事务提交 */
export class WeaveEditor {
  constructor(
    private readonly root: WeaveRoot,
    private readonly transaction: WeaveTransaction,
    private readonly scopeIds: IdAllocator,
  ) {}

  /**
   * 将一条增删改操作应用到候选声明树，并返回需由协调器处理的变化事实
   * @description 此处只维护候选条目、容器结构和受影响名称；依赖传播、编译及最终提交留给调用方。空插入仍校验位置，但不产生变化
   */
  applyOperation(operation: WeaveOperation, context: CanonicalScopeInheritance): WeaveEditResult | undefined {
    const changes: WeaveEditResult = {
      names: new Set(),
      namespaces: new Set(),
      changedEntries: [],
      insertedEntries: [],
      removedEntries: [],
      indexesChanged: operation.kind !== WeaveOperationKind.Update,
    };
    switch (operation.kind) {
      case WeaveOperationKind.Insert: {
        const parent = this.findScope(operation.parentId);
        const length = this.transaction.readState(parent).children.length;
        if (!Number.isInteger(operation.index) || operation.index < 0 || operation.index > length)
          throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave insertion index is out of bounds');
        if (operation.elements.length === 0) return;
        changes.structure = { parent, index: operation.index };
        const inserted = operation.elements.map(input =>
          this.insertSubtree(input, parent, context, changes.insertedEntries),
        );
        const children = this.transaction.editStateAttribute(parent, 'children');
        /** 创建条目时先追加到容器尾部，此处移除临时尾段并按指定索引放入 */
        children.splice(length, inserted.length);
        children.splice(operation.index, 0, ...inserted);
        changes.changedEntries.push(...inserted);
        for (const entry of inserted) this.collectIndexChanges(entry, changes);
        if (parent.type === 'scope') changes.changedEntries.push(parent);
        break;
      }
      case WeaveOperationKind.Update: {
        const entry = this.requireTargetEntry(operation.target);
        if ('namespace' in operation.input) {
          if (entry.type !== 'composite')
            throw new RetikzReconcilerError(
              RetikzReconcilerErrorCode.Contract,
              'Weave input type does not match target',
            );
          const state = this.transaction.editState(entry);
          state.origin = { ...state.origin, own: operation.input };
          state.bindings = operation.bindings?.length
            ? captureCompositeInputScope(operation.input, operation.bindings).bindings
            : undefined;
          changes.changedEntries.push(entry);
          break;
        }
        changes.changedEntries.push(entry);
        if (operation.bindings !== undefined)
          throw new RetikzReconcilerError(
            RetikzReconcilerErrorCode.Contract,
            'Only a Composite accepts runtime input bindings',
          );
        const before = this.transaction.readState(entry).origin.own;
        const after = operation.input;
        const namespaceChanged =
          entry.type === 'scope' &&
          ('localNamespace' in before ? before.localNamespace : undefined) !==
            ('localNamespace' in after ? after.localNamespace : undefined);
        changes.indexesChanged =
          before.id !== after.id ||
          !compareProperties(
            'aliasIds' in before ? before.aliasIds : undefined,
            'aliasIds' in after ? after.aliasIds : undefined,
          ) ||
          namespaceChanged;
        /** 名称或空间变化需分别收集替换前后的声明，供后续重建索引与失效订阅 */
        if (changes.indexesChanged) this.collectIndexChanges(entry, changes, namespaceChanged);
        this.replaceEntryInput(entry, operation.input);
        if (changes.indexesChanged) this.collectIndexChanges(entry, changes, namespaceChanged);
        break;
      }
      case WeaveOperationKind.Remove: {
        const entry = this.requireTargetEntry(operation.target);
        if (entry.type === 'composite')
          throw new RetikzReconcilerError(
            RetikzReconcilerErrorCode.Contract,
            'Replace the scene to remove a Composite declaration',
          );
        changes.changedEntries.push(entry);
        /** 移除前记录旧声明名称；脱离候选树的整棵子树留给协调器断开依赖 */
        this.collectIndexChanges(entry, changes);
        const parent = this.transaction.readState(entry).parent;
        const children = this.transaction.editStateAttribute(parent, 'children');
        const index = children.indexOf(entry);
        changes.structure = { parent, index };
        children.splice(index, 1);
        this.removeSubtreeAddresses(entry, changes.removedEntries);
        if (parent.type === 'scope') changes.changedEntries.push(parent);
        break;
      }
    }
    return changes;
  }

  /** 只重算发生变化的名称，重名顺序由已更新的声明地址索引决定 */
  refreshIndexes(changes: WeaveEditResult, addresses: WeaveAddressIndex): void {
    for (const namespace of changes.namespaces) {
      if (changes.removedEntries.includes(namespace as WeaveEntry)) continue;
      if (namespace.type === 'scope' && !this.transaction.readState(namespace).origin.own.localNamespace) {
        if (this.transaction.readState(namespace).ids !== undefined) delete this.transaction.editState(namespace).ids;
        continue;
      }
      if (this.transaction.readState(namespace).ids === undefined)
        this.transaction.editState(namespace).ids = new WeaveLookup();
      for (const name of changes.names) {
        const next = addresses.names.lastDeclaration(namespace, name);
        if (this.transaction.readState(namespace).ids?.get(name) === next) continue;
        const ids = this.transaction.editStateAttribute(namespace, 'ids');
        if (next === undefined) ids.delete(name);
        else ids.set(name, next);
      }
    }
  }

  /** 空间切换只收集变动子树的名称；普通改名只访问该声明 */
  private collectIndexChanges(entry: WeaveEntry, changes: WeaveEditResult, descendants = true): void {
    const state = this.transaction.readState(entry);
    let parent = state.parent;
    while (parent.type !== 'root' && !this.transaction.readState(parent).origin.own.localNamespace)
      parent = this.transaction.readState(parent).parent;
    changes.namespaces.add(parent);
    const own = state.origin.own;
    if (!('namespace' in own)) {
      if (own.id !== undefined) changes.names.add(own.id);
      if (own.type === 'node') for (const name of own.aliasIds ?? []) changes.names.add(name);
    }
    if (entry.type === 'scope' && descendants) {
      changes.namespaces.add(entry);
      for (const child of this.transaction.readState(entry).children) this.collectIndexChanges(child, changes);
    }
  }

  /** 创建声明条目并登记本次编译的条目与容器索引 */
  createEntry(
    childElement: IRChild,
    parent: WeaveRoot | WeaveScopeEntry,
    context: CanonicalScopeInheritance,
  ): WeaveEntry {
    const base = {
      parent,
      pendingInputs: [],
      referenceReads: [],
      dependencies: new Map<WeaveEntry, Array<WeaveDependencyKind>>(),
      consumers: new Set<WeaveEntry>(),
    };
    let entry: WeaveEntry;
    if ('namespace' in childElement) {
      entry = { type: 'composite', current: null, pending: { ...base, origin: { own: childElement, context } } };
    } else
      switch (childElement.type) {
        case 'node':
          entry = {
            type: 'node',
            current: null,
            pending: { ...base, origin: { own: childElement, context } },
          };
          break;
        case 'coordinate':
          entry = {
            type: 'coordinate',
            current: null,
            pending: { ...base, origin: { own: childElement, context } },
          };
          break;
        case 'scope': {
          const { children: nested, ...scopeInput } = childElement;
          const { localNamespace } = scopeInput;
          void nested;
          entry = {
            type: 'scope',
            scopeId: this.scopeIds.next(),
            current: null,
            pending: {
              ...base,
              origin: { own: scopeInput, context },

              children: [],
              ...(localNamespace ? { ids: new WeaveLookup<string, WeaveEntry>() } : {}),
            },
          };
          this.transaction.editStateAttribute(this.root, 'scopeIds').set(entry.scopeId, entry);
          break;
        }
        default:
          entry = {
            type: 'path',
            current: null,
            pending: { ...base, origin: { own: childElement, context } },
          };
      }
    this.transaction.editState(entry);
    this.transaction.editStateAttribute(parent, 'children').push(entry);
    return entry;
  }

  /** 解析批次容器，地址仅在当前候选结构内有效 */
  private findScope(scopeId: string): WeaveRoot | WeaveScopeEntry {
    const scopeEntry = this.transaction.readState(this.root).scopeIds.get(scopeId);
    if (scopeEntry === undefined)
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Unknown Weave scope', {
        details: { scopeId },
      });
    return scopeEntry;
  }

  /** 解析元素地址，不允许把 Root 当成基础元素 */
  private requireTargetEntry(target: WeaveTarget): WeaveEntry {
    let container = this.findScope(target.scopeId);
    if (target.kind === 'scope') {
      if (container.type !== 'root') return container;
    } else if (target.kind === 'child') {
      const child =
        Number.isInteger(target.index) && target.index >= 0
          ? this.transaction.readState(container).children[target.index]
          : undefined;
      if (child !== undefined) return child;
    } else {
      for (;;) {
        const state = this.transaction.readState(container);
        const found = state.ids?.get(target.id);
        if (found !== undefined) return found;
        if (container.type === 'root') break;
        container = this.transaction.readState(container).parent;
      }
    }
    throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Unknown Weave target', {
      details: { target },
    });
  }

  /** 按判别类型替换权威输入，不保留被省略的旧覆盖 */
  private replaceEntryInput(entry: WeaveEntry, input: InputWeaveOwn): void {
    if (entry.type === 'node' && input.type === 'node')
      this.transaction.editState(entry).origin = { ...this.transaction.readState(entry).origin, own: input };
    else if (entry.type === 'coordinate' && input.type === 'coordinate')
      this.transaction.editState(entry).origin = { ...this.transaction.readState(entry).origin, own: input };
    else if (entry.type === 'scope' && input.type === 'scope')
      this.transaction.editState(entry).origin = { ...this.transaction.readState(entry).origin, own: input };
    else if (entry.type === 'path' && input.type === 'path')
      this.transaction.editState(entry).origin = { ...this.transaction.readState(entry).origin, own: input };
    else throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave input type does not match target');
    this.transaction
      .editStateAttribute(entry, 'pendingInputs')
      .push({ source: 'own', changes: new Set(['style', 'layout']) });
  }

  /** 创建子树并收集新增条目，初始 context 在正式编译遍历时解析更新 */
  private insertSubtree(
    input: InputWeaveElement,
    parent: WeaveRoot | WeaveScopeEntry,
    context: CanonicalScopeInheritance,
    insertedEntries: Array<WeaveEntry>,
  ): WeaveEntry {
    const entry = this.createEntry(input, parent, context);
    insertedEntries.push(entry);
    if (entry.type === 'scope' && input.type === 'scope') {
      for (const child of input.children) this.insertSubtree(child, entry, context, insertedEntries);
    }
    return entry;
  }

  /** 移除子树的容器地址，保留条目状态供后续失效传播和依赖解绑 */
  private removeSubtreeAddresses(entry: WeaveEntry, removedEntries: Array<WeaveEntry>): void {
    removedEntries.push(entry);
    if (entry.type === 'scope') {
      for (const child of this.transaction.readState(entry).children)
        this.removeSubtreeAddresses(child, removedEntries);
      this.transaction.editStateAttribute(this.root, 'scopeIds').delete(entry.scopeId);
    }
  }
}
