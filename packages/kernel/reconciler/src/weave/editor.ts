import { formatCompileChildPath } from '@retikz/core';
import type { ElementCompileOptions, IRChild, IRComposite } from '@retikz/core';

import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../error';
import { readWeaveCurrent } from './transaction';
import type { WeaveTransaction } from './transaction';
import type {
  WeaveDependencyKind,
  WeaveElementInput,
  WeaveNode,
  WeaveOperation,
  WeaveOwnInput,
  WeaveRoot,
  WeaveScopeNode,
  WeaveTarget,
} from './types';

/** 单次声明编辑产生的变化，供协调器安排依赖传播与事务清理 */
type WeaveEditResult = {
  /** 自身输入或声明成员发生变化的节点，不包含推导的消费者 */
  changedNodes: Array<WeaveNode>;
  /** 新建的全部节点，用于登记编译 binding */
  insertedNodes: Array<WeaveNode>;
  /** 已脱离候选树的节点，按父先子后排列，依赖断开前仍可读取其状态 */
  removedNodes: Array<WeaveNode>;
};

/** 编辑候选声明树与寻址索引，不负责依赖传播、Core 编译或事务提交 */
export class WeaveEditor {
  /** 本树递增的 Scope 编号，删除或回滚不会复用已分配编号 */
  private nextScopeId = 0;

  constructor(
    private readonly root: WeaveRoot,
    private transaction: WeaveTransaction,
  ) {}

  /** 切换后续编辑使用的事务，保留本树 Scope 编号 */
  useTransaction(transaction: WeaveTransaction): void {
    this.transaction = transaction;
  }

  /** 应用一条操作并刷新候选地址；空插入仍校验位置，但不产生变化 */
  applyOperation(operation: WeaveOperation, context: ElementCompileOptions['context']): WeaveEditResult | undefined {
    const changes: WeaveEditResult = { changedNodes: [], insertedNodes: [], removedNodes: [] };
    if (operation.kind === 'insert') {
      const parent = this.findScope(operation.parentId);
      const length = this.transaction.readNode(parent).children.length;
      if (!Number.isInteger(operation.index) || operation.index < 0 || operation.index > length)
        throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave insertion index is out of bounds');
      if (operation.elements.length === 0) return;
      const inserted = operation.elements.map(input =>
        this.insertSubtree(input, parent, context, changes.insertedNodes),
      );
      const children = this.transaction.editNodeAttribute(parent, 'children');
      children.splice(length, inserted.length);
      children.splice(operation.index, 0, ...inserted);
      changes.changedNodes.push(...inserted);
      if (parent.type === 'scope') changes.changedNodes.push(parent);
    } else {
      const node = this.findTargetNode(operation.target);
      changes.changedNodes.push(node);
      if (operation.kind === 'update') this.replaceNodeInput(node, operation.input);
      else {
        const parent = this.transaction.readNode(node).parent;
        const children = this.transaction.editNodeAttribute(parent, 'children');
        children.splice(children.indexOf(node), 1);
        this.removeSubtreeAddresses(node, changes.removedNodes);
        if (parent.type === 'scope') changes.changedNodes.push(parent);
      }
    }
    this.rebuildIdIndexes(this.root);
    return changes;
  }

  /** 根据已提交声明结构记录旧路径，key 为稳定节点，value 为操作前的 irPath */
  captureNodeIrPaths(): Map<WeaveNode, string> {
    const paths = new Map<WeaveNode, string>();
    const visit = (container: WeaveRoot | WeaveScopeNode, prefix: string): void => {
      for (const [index, child] of readWeaveCurrent(container).children.entries()) {
        const path = formatCompileChildPath(prefix, index, child.type);
        paths.set(child, path);
        if (child.type === 'scope') visit(child, `${path}.`);
      }
    };
    visit(this.root, '');
    return paths;
  }

  /** 创建声明节点并登记本次编译的节点与容器索引 */
  createNode(
    childElement: Exclude<IRChild, IRComposite>,
    parentWeaveNode: WeaveRoot | WeaveScopeNode,
    context: ElementCompileOptions['context'],
  ): WeaveNode {
    const base = {
      parent: parentWeaveNode,
      pendingInputs: [],
      dependencies: new Map<WeaveNode, Array<WeaveDependencyKind>>(),
      consumers: new Set<WeaveNode>(),
    };
    let node: WeaveNode;
    switch (childElement.type) {
      case 'node':
        node = {
          type: 'node',
          current: null,
          pending: { ...base, input: { own: childElement, context }, compiled: null },
        };
        break;
      case 'coordinate':
        node = {
          type: 'coordinate',
          current: null,
          pending: { ...base, input: { own: childElement, context }, compiled: null },
        };
        break;
      case 'scope': {
        const { children: nested, ...scopeInput } = childElement;
        void nested;
        node = {
          type: 'scope',
          scopeId: `${this.root.scopeId}/scope-${this.nextScopeId++}`,
          current: null,
          pending: {
            ...base,
            input: { own: scopeInput, context },
            compiled: null,
            children: [],
            ...(childElement.localNamespace ? { ids: new Map<string, WeaveNode>() } : {}),
          },
        };
        this.transaction.editNodeAttribute(this.root, 'scopeIds').set(node.scopeId, node);
        break;
      }
      default:
        node = {
          type: 'path',
          current: null,
          pending: { ...base, input: { own: childElement, context }, compiled: null },
        };
    }
    this.transaction.editNode(node);
    this.transaction.editNodeAttribute(parentWeaveNode, 'children').push(node);
    return node;
  }

  /** 序列化候选声明供 Core 组装和来源遍历，不比较新旧完整 IR */
  serializeNodeDeclaration(node: WeaveNode): WeaveElementInput {
    if (node.type === 'scope') {
      const state = this.transaction.readNode(node);
      return { ...state.input.own, children: state.children.map(child => this.serializeNodeDeclaration(child)) };
    }
    return this.transaction.readNode(node).input.own;
  }

  /** 重建操作寻址索引；编译引用仍由 Core 按声明顺序建立 */
  private rebuildIdIndexes(container: WeaveRoot | WeaveScopeNode, inherited?: Map<string, WeaveNode>): void {
    const ids =
      container.type === 'root' || this.transaction.readNode(container).input.own.localNamespace
        ? new Map<string, WeaveNode>()
        : inherited;
    if (ids === undefined)
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Missing namespace owner');
    if (container.type === 'root') this.transaction.editNode(container).ids = ids;
    else {
      const state = this.transaction.editNode(container);
      if (state.input.own.localNamespace) state.ids = ids;
      else delete state.ids;
    }
    for (const child of this.transaction.readNode(container).children) {
      const own = this.transaction.readNode(child).input.own;
      if (own.id !== undefined) ids.set(own.id, child);
      if (child.type === 'node') {
        for (const id of this.transaction.readNode(child).input.own.aliasIds ?? []) ids.set(id, child);
      }
      if (child.type === 'scope') this.rebuildIdIndexes(child, ids);
    }
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
  private replaceNodeInput(node: WeaveNode, input: WeaveOwnInput): void {
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
    input: WeaveElementInput,
    parent: WeaveRoot | WeaveScopeNode,
    context: ElementCompileOptions['context'],
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
