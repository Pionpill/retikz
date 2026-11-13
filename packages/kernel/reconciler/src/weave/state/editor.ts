import type { CanonicalScopeInheritance, IRChild } from '@retikz/core';
import type { IdAllocator } from '@retikz/foundation';
import { jsonStructuralEquals } from '@retikz/foundation';

import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../../error';
import { WeaveOperationKind } from '../shared';
import type {
  WeaveDependencyKind,
  InputWeaveElement,
  WeaveNode,
  WeaveOperation,
  InputWeaveOwn,
  WeaveRoot,
  WeaveScopeNode,
  WeaveTarget,
} from '../shared';
import type { WeaveAddressIndex } from './address';
import { WeaveLookup } from './lookup';
import type { WeaveTransaction } from './transaction';

/** 单次声明编辑产生的变化，供协调器安排依赖传播与事务清理 */
type WeaveEditResult = {
  /** 本次声明变化涉及的名称与原/新空间，用于精确更新操作索引 */
  names: Set<string>;
  namespaces: Set<WeaveRoot | WeaveScopeNode>;
  /** 自身输入或声明成员发生变化的节点，不包含推导的消费者 */
  changedNodes: Array<WeaveNode>;
  /** 名称声明或命名空间归属变化 */
  indexesChanged: boolean;
  /** 插删改变的容器；仅它的后续子地址需要刷新 */
  structure?: { parent: WeaveRoot | WeaveScopeNode; index: number };
  /** 新建的全部节点，用于登记编译 binding */
  insertedNodes: Array<WeaveNode>;
  /** 已脱离候选树的节点，按父先子后排列，依赖断开前仍可读取其状态 */
  removedNodes: Array<WeaveNode>;
};

/** 编辑候选声明树与寻址索引，不负责依赖传播、Core 编译或事务提交 */
export class WeaveEditor {
  constructor(
    private readonly root: WeaveRoot,
    private readonly transaction: WeaveTransaction,
    private readonly scopeIds: IdAllocator,
  ) {}

  /** 应用一条操作并刷新候选地址；空插入仍校验位置，但不产生变化 */
  applyOperation(operation: WeaveOperation, context: CanonicalScopeInheritance): WeaveEditResult | undefined {
    const changes: WeaveEditResult = {
      names: new Set(),
      namespaces: new Set(),
      changedNodes: [],
      insertedNodes: [],
      removedNodes: [],
      indexesChanged: operation.kind !== WeaveOperationKind.Update,
    };
    if (operation.kind === WeaveOperationKind.Insert) {
      const parent = this.findScope(operation.parentId);
      const length = this.transaction.readNode(parent).children.length;
      if (!Number.isInteger(operation.index) || operation.index < 0 || operation.index > length)
        throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave insertion index is out of bounds');
      if (operation.elements.length === 0) return;
      changes.structure = { parent, index: operation.index };
      const inserted = operation.elements.map(input =>
        this.insertSubtree(input, parent, context, changes.insertedNodes),
      );
      const children = this.transaction.editNodeAttribute(parent, 'children');
      children.splice(length, inserted.length);
      children.splice(operation.index, 0, ...inserted);
      changes.changedNodes.push(...inserted);
      for (const node of inserted) this.collectIndexChanges(node, changes);
      if (parent.type === 'scope') changes.changedNodes.push(parent);
    } else {
      const node = this.findTargetNode(operation.target);
      if (node.type === 'composite')
        throw new RetikzReconcilerError(
          RetikzReconcilerErrorCode.Contract,
          'Replace the scene to edit a Composite declaration',
        );
      changes.changedNodes.push(node);
      if (operation.kind === WeaveOperationKind.Update) {
        const before = this.transaction.readNode(node).input.own;
        const after = operation.input;
        const namespaceChanged =
          node.type === 'scope' &&
          ('localNamespace' in before ? before.localNamespace : undefined) !==
            ('localNamespace' in after ? after.localNamespace : undefined);
        changes.indexesChanged =
          before.id !== after.id ||
          !jsonStructuralEquals(
            'aliasIds' in before ? before.aliasIds : undefined,
            'aliasIds' in after ? after.aliasIds : undefined,
          ) ||
          namespaceChanged;
        if (changes.indexesChanged) this.collectIndexChanges(node, changes, namespaceChanged);
        this.replaceNodeInput(node, operation.input);
        if (changes.indexesChanged) this.collectIndexChanges(node, changes, namespaceChanged);
      } else {
        this.collectIndexChanges(node, changes);
        const parent = this.transaction.readNode(node).parent;
        const children = this.transaction.editNodeAttribute(parent, 'children');
        const index = children.indexOf(node);
        changes.structure = { parent, index };
        children.splice(index, 1);
        this.removeSubtreeAddresses(node, changes.removedNodes);
        if (parent.type === 'scope') changes.changedNodes.push(parent);
      }
    }
    return changes;
  }

  /** 只重算发生变化的名称，重名顺序由已更新的声明地址索引决定 */
  refreshIndexes(changes: WeaveEditResult, addresses: WeaveAddressIndex): void {
    for (const namespace of changes.namespaces) {
      if (changes.removedNodes.includes(namespace as WeaveNode)) continue;
      if (namespace.type === 'scope' && !this.transaction.readNode(namespace).input.own.localNamespace) {
        if (this.transaction.readNode(namespace).ids !== undefined) delete this.transaction.editNode(namespace).ids;
        continue;
      }
      if (this.transaction.readNode(namespace).ids === undefined)
        this.transaction.editNode(namespace).ids = new WeaveLookup();
      for (const name of changes.names) {
        const next = addresses.names.lastDeclaration(namespace, name);
        if (this.transaction.readNode(namespace).ids?.get(name) === next) continue;
        const ids = this.transaction.editNodeAttribute(namespace, 'ids');
        if (next === undefined) ids.delete(name);
        else ids.set(name, next);
      }
    }
  }

  /** 空间切换只收集变动子树的名称；普通改名只访问该声明 */
  private collectIndexChanges(node: WeaveNode, changes: WeaveEditResult, descendants = true): void {
    const state = this.transaction.readNode(node);
    let parent = state.parent;
    while (parent.type !== 'root' && !this.transaction.readNode(parent).input.own.localNamespace)
      parent = this.transaction.readNode(parent).parent;
    changes.namespaces.add(parent);
    const own = state.input.own;
    if (!('namespace' in own)) {
      if (own.id !== undefined) changes.names.add(own.id);
      if (own.type === 'node') for (const name of own.aliasIds ?? []) changes.names.add(name);
    }
    if (node.type === 'scope' && descendants) {
      changes.namespaces.add(node);
      for (const child of this.transaction.readNode(node).children) this.collectIndexChanges(child, changes);
    }
  }

  /** 创建声明节点并登记本次编译的节点与容器索引 */
  createNode(
    childElement: IRChild,
    parentWeaveNode: WeaveRoot | WeaveScopeNode,
    context: CanonicalScopeInheritance,
  ): WeaveNode {
    const base = {
      parent: parentWeaveNode,
      pendingInputs: [],
      dependencies: new Map<WeaveNode, Array<WeaveDependencyKind>>(),
      consumers: new Set<WeaveNode>(),
    };
    let node: WeaveNode;
    if ('namespace' in childElement) {
      node = { type: 'composite', current: null, pending: { ...base, input: { own: childElement, context } } };
    } else
      switch (childElement.type) {
        case 'node':
          node = {
            type: 'node',
            current: null,
            pending: { ...base, input: { own: childElement, context }, canon: null, compiled: null },
          };
          break;
        case 'coordinate':
          node = {
            type: 'coordinate',
            current: null,
            pending: { ...base, input: { own: childElement, context }, canon: null, compiled: null },
          };
          break;
        case 'scope': {
          const { children: nested, ...scopeInput } = childElement;
          const { localNamespace } = scopeInput;
          void nested;
          node = {
            type: 'scope',
            scopeId: this.scopeIds.next(),
            current: null,
            pending: {
              ...base,
              input: { own: scopeInput, context },
              canon: null,
              compiled: null,
              children: [],
              ...(localNamespace ? { ids: new WeaveLookup<string, WeaveNode>() } : {}),
            },
          };
          this.transaction.editNodeAttribute(this.root, 'scopeIds').set(node.scopeId, node);
          break;
        }
        default:
          node = {
            type: 'path',
            current: null,
            pending: { ...base, input: { own: childElement, context }, canon: null, compiled: null },
          };
      }
    this.transaction.editNode(node);
    this.transaction.editNodeAttribute(parentWeaveNode, 'children').push(node);
    return node;
  }

  /** 序列化候选声明供 Core 组装和来源遍历，不比较新旧完整 IR */
  serializeNodeDeclaration(node: WeaveNode): IRChild {
    if (node.type === 'scope') {
      const state = this.transaction.readNode(node);
      return { ...state.input.own, children: state.children.map(child => this.serializeNodeDeclaration(child)) };
    }
    return this.transaction.readNode(node).input.own;
  }

  /** 解析批次容器，地址仅在当前候选结构内有效 */
  private findScope(scopeId: string): WeaveRoot | WeaveScopeNode {
    const scopeNode = this.transaction.readNode(this.root).scopeIds.get(scopeId);
    if (scopeNode === undefined)
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Unknown Weave scope', {
        details: { scopeId },
      });
    return scopeNode;
  }

  /** 解析元素地址，不允许把 Root 当成基础元素 */
  private findTargetNode(target: WeaveTarget): WeaveNode {
    let container = this.findScope(target.scopeId);
    if (target.kind === 'scope') {
      if (container.type !== 'root') return container;
    } else if (target.kind === 'child') {
      const child =
        Number.isInteger(target.index) && target.index >= 0
          ? this.transaction.readNode(container).children[target.index]
          : undefined;
      if (child !== undefined) return child;
    } else {
      for (;;) {
        const state = this.transaction.readNode(container);
        const found = state.ids?.get(target.id);
        if (found !== undefined) return found;
        if (container.type === 'root') break;
        container = this.transaction.readNode(container).parent;
      }
    }
    throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Unknown Weave target', {
      details: { target },
    });
  }

  /** 按判别类型替换权威输入，不保留被省略的旧覆盖 */
  private replaceNodeInput(node: WeaveNode, input: InputWeaveOwn): void {
    if (node.type === 'node' && input.type === 'node')
      this.transaction.editNode(node).input = { ...this.transaction.readNode(node).input, own: input };
    else if (node.type === 'coordinate' && input.type === 'coordinate')
      this.transaction.editNode(node).input = { ...this.transaction.readNode(node).input, own: input };
    else if (node.type === 'scope' && input.type === 'scope')
      this.transaction.editNode(node).input = { ...this.transaction.readNode(node).input, own: input };
    else if (node.type === 'path' && input.type === 'path')
      this.transaction.editNode(node).input = { ...this.transaction.readNode(node).input, own: input };
    else throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave input type does not match target');
    this.transaction
      .editNodeAttribute(node, 'pendingInputs')
      .push({ source: 'own', changes: new Set(['style', 'layout']) });
  }

  /** 创建子树并收集新增节点，初始 context 在正式编译遍历时解析更新 */
  private insertSubtree(
    input: InputWeaveElement,
    parent: WeaveRoot | WeaveScopeNode,
    context: CanonicalScopeInheritance,
    insertedNodes: Array<WeaveNode>,
  ): WeaveNode {
    const node = this.createNode(input, parent, context);
    insertedNodes.push(node);
    if (node.type === 'scope' && input.type === 'scope') {
      for (const child of input.children) this.insertSubtree(child, node, context, insertedNodes);
    }
    return node;
  }

  /** 移除子树的容器地址，保留节点状态供后续失效传播和依赖解绑 */
  private removeSubtreeAddresses(node: WeaveNode, removedNodes: Array<WeaveNode>): void {
    removedNodes.push(node);
    if (node.type === 'scope') {
      for (const child of this.transaction.readNode(node).children) this.removeSubtreeAddresses(child, removedNodes);
      this.transaction.editNodeAttribute(this.root, 'scopeIds').delete(node.scopeId);
    }
  }
}
