import type { CompileWarning } from '@retikz/core';

import type { WeaveCompileRead, WeaveCompileOptions } from './compile';
import { lookupWeaveBinding } from './compile';
import { readWeaveCurrent } from './transaction';
import type { WeaveTransaction } from './transaction';
import type { WeaveNode, WeaveRoot, WeaveScopeNode } from './types';

/** 维护编译读取、双向依赖与批次失效，不编辑声明结构或执行编译 */
export class WeaveTracker {
  /** Core binding 对象到稳定节点的映射，跨批保留，确认或回滚时清理失效绑定 */
  private readonly bindings = new Map<object, WeaveNode>();
  /** 本批已失效节点，用于传播去重与阻止缓存复用，不是待执行队列 */
  private readonly dirtyNodes = new Set<WeaveNode>();

  constructor(
    private readonly root: WeaveRoot,
    private transaction: WeaveTransaction,
  ) {}

  /** 开始新批次，切换事务并清空上批失效标记 */
  beginBatch(transaction: WeaveTransaction): void {
    this.transaction = transaction;
    this.dirtyNodes.clear();
  }

  /** 将节点登记为可被 Core 读取记录引用的生产者 */
  registerNodeBinding(node: WeaveNode): void {
    this.bindings.set(node, node);
  }

  /** 判断节点是否已被本批次失效传播覆盖 */
  isNodeDirty(node: WeaveNode): boolean {
    return this.dirtyNodes.has(node);
  }

  /** 标记计算关联闭包；Scope 的最终变换也可能改变后代引用投影 */
  invalidateNode(node: WeaveNode): void {
    if (this.dirtyNodes.has(node)) return;
    this.dirtyNodes.add(node);
    const state = this.transaction.readNode(node);
    for (const consumer of state.consumers) {
      if (!this.dirtyNodes.has(consumer))
        this.transaction
          .editNodeAttribute(consumer, 'pendingInputs')
          .push({ source: 'dependency', producer: node, changes: new Set(['style', 'layout']) });
      this.invalidateNode(consumer);
    }
    if (node.type === 'scope') {
      for (const child of this.transaction.readNode(node).children) {
        if (!this.dirtyNodes.has(child))
          this.transaction
            .editNodeAttribute(child, 'pendingInputs')
            .push({ source: 'dependency', producer: node, changes: new Set(['style', 'layout']) });
        this.invalidateNode(child);
      }
    }
  }

  /** 把复用产物的读取记录关联到本批名称 frame，避免保留旧工作区 */
  refreshCompileReads(
    reads: ReadonlyArray<WeaveCompileRead>,
    compileOptions: WeaveCompileOptions,
  ): Array<WeaveCompileRead> {
    const refreshed: Array<WeaveCompileRead> = [];
    for (const name of new Set(reads.map(read => read.name))) {
      lookupWeaveBinding(compileOptions.namespace, name, refreshed);
    }
    return refreshed;
  }

  /** 保存读取与诊断，并以最新读取事实重建节点的双向计算依赖 */
  recordNodeReads(
    node: WeaveNode,
    compileReads: ReadonlyArray<WeaveCompileRead>,
    diagnostics: ReadonlyArray<CompileWarning>,
    append = false,
  ): void {
    const previous = append ? this.transaction.readNode(this.root).records.get(node) : undefined;
    const reads = [...(previous?.reads ?? []), ...compileReads];
    this.transaction.editNodeAttribute(this.root, 'records').set(node, {
      reads,
      diagnostics: [...(previous?.diagnostics ?? []), ...diagnostics],
    });

    // 重新构建拓扑关系
    for (const producer of this.transaction.readNode(node).dependencies.keys())
      this.transaction.editNodeAttribute(producer, 'consumers').delete(node);
    this.transaction.editNodeAttribute(node, 'dependencies').clear();
    for (const read of reads) {
      const producer = read.binding === undefined ? undefined : this.bindings.get(read.binding);
      if (producer === undefined) continue;
      this.transaction.editNodeAttribute(node, 'dependencies').set(producer, [null]);
      this.transaction.editNodeAttribute(producer, 'consumers').add(node);
    }
  }

  /** 登记 Scope 包络对子元素布局的依赖，Path 不参与引用包络 */
  recordScopeLayoutDependencies(node: WeaveScopeNode): void {
    for (const dependency of this.transaction.readNode(node).children) {
      if (dependency.type === 'path') continue;
      this.transaction.editNodeAttribute(node, 'dependencies').set(dependency, [null]);
      this.transaction.editNodeAttribute(dependency, 'consumers').add(node);
    }
  }

  /** 删除节点的双向计算关联与读取记录，不修改声明父子关系 */
  detachNodeDependencies(node: WeaveNode): void {
    const state = this.transaction.readNode(node);
    for (const producer of state.dependencies.keys())
      this.transaction.editNodeAttribute(producer, 'consumers').delete(node);
    for (const consumer of state.consumers) this.transaction.editNodeAttribute(consumer, 'dependencies').delete(node);
    this.transaction.editNodeAttribute(this.root, 'records').delete(node);
  }

  /** 最终确认后移除已不在提交树中的 binding，避免继续持有删除的节点 */
  pruneRemovedBindings(): void {
    const retained = new Set<WeaveNode>();
    const collect = (container: WeaveRoot | WeaveScopeNode): void => {
      for (const node of readWeaveCurrent(container).children) {
        retained.add(node);
        if (node.type === 'scope') collect(node);
      }
    };
    collect(this.root);
    for (const node of this.bindings.values()) if (!retained.has(node)) this.bindings.delete(node);
  }

  /** 回滚后移除从未提交的新增节点 binding，保留原有节点绑定 */
  pruneUncommittedBindings(): void {
    for (const node of this.bindings.values()) if (node.current === null) this.bindings.delete(node);
  }
}
