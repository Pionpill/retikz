import type { CompileWarning } from '@retikz/core';
import { jsonStructuralEquals } from '@retikz/foundation';

import type { WeaveCompileRead } from '../shared';
import type { WeaveNode, WeaveRoot, WeaveScopeNode } from '../shared';
import type { WeaveTransaction } from './transaction';

/** 维护编译读取、双向依赖与批次失效，不编辑声明结构或执行编译 */
export class WeaveTracker {
  /** 本批已失效节点，用于传播去重与阻止缓存复用，不是待执行队列 */
  private readonly dirtyNodes = new Set<WeaveNode>();
  /** 仅可能受上游影响的节点；读取结果未变时不进入领域计算 */
  private readonly checkedNodes = new Set<WeaveNode>();

  /** 仅回收本批新增但未提交的身份 */
  private readonly inserted = new Set<WeaveNode>();
  /** 提交成功后释放被移除的绑定 */
  private readonly removed = new Set<WeaveNode>();

  /** 自身输入或可见绑定确实变化的节点 */
  get requests(): ReadonlySet<WeaveNode> {
    return this.checkedNodes;
  }

  constructor(
    private readonly root: WeaveRoot,
    private readonly transaction: WeaveTransaction,
    private readonly bindings: Map<object, WeaveNode>,
  ) {}

  /** 将节点登记为可被 Core 读取记录引用的生产者 */
  registerNodeBinding(node: WeaveNode): void {
    this.bindings.set(node, node);
    this.inserted.add(node);
  }

  /** 判断节点是否已被本批次失效传播覆盖 */
  isNodeDirty(node: WeaveNode): boolean {
    return this.dirtyNodes.has(node) || this.checkedNodes.has(node);
  }

  /** 没有自身输入或继承变化，可以通过实际读取结果确认旧贡献 */
  canCheckNode(node: WeaveNode): boolean {
    return !this.dirtyNodes.has(node) && this.checkedNodes.has(node);
  }

  /** 名称声明变化同时唤醒未命中读取，不能只沿已有生产者边传播 */
  invalidateBindings(names: ReadonlySet<string>, changed: (node: WeaveNode) => boolean): void {
    const readers = this.transaction.readNode(this.root).readers;
    const checked = new Set<WeaveNode>();
    for (const name of names)
      for (const node of readers.get(name) ?? []) {
        if (checked.has(node)) continue;
        checked.add(node);
        if (changed(node)) this.checkNode(node);
      }
  }

  /** 仅登记自身输入变化，后代环境与引用结果由读取点核对 */
  invalidateNode(node: WeaveNode): void {
    if (this.dirtyNodes.has(node)) return;
    this.dirtyNodes.add(node);
    this.checkNode(node);
  }

  /** 登记名称变化，不提前扩散消费闭包 */
  private checkNode(node: WeaveNode): void {
    if (this.checkedNodes.has(node)) return;
    this.checkedNodes.add(node);
  }

  /** 保存读取与诊断，并以最新读取事实重建节点的双向计算依赖 */
  recordNodeReads(
    node: WeaveNode,
    compileReads: ReadonlyArray<WeaveCompileRead>,
    diagnostics: ReadonlyArray<CompileWarning>,
    append = false,
  ): void {
    const oldRecord = this.transaction.readNode(this.root).records.get(node);
    const previous = append ? oldRecord : undefined;
    const reads = [...(previous?.reads ?? []), ...compileReads];
    const sameReads =
      oldRecord !== undefined &&
      oldRecord.reads.length === reads.length &&
      reads.every((read, index) => {
        const old = oldRecord.reads[index];
        return (
          old.name === read.name &&
          old.binding === read.binding &&
          old.state === read.state &&
          jsonStructuralEquals(old.kind, read.kind)
        );
      });
    if (sameReads && jsonStructuralEquals(oldRecord.diagnostics, diagnostics)) return;
    const names = new Set([...(oldRecord?.reads ?? []).map(read => read.name), ...reads.map(read => read.name)]);
    for (const name of names) {
      const readers = this.transaction.editNodeAttribute(this.root, 'readers');
      const subscribers = new Set(readers.get(name));
      if (reads.some(read => read.name === name)) subscribers.add(node);
      else subscribers.delete(node);
      if (subscribers.size === 0) readers.delete(name);
      else readers.set(name, subscribers);
    }
    this.transaction.editNodeAttribute(this.root, 'records').set(node, {
      reads,
      diagnostics: [...(previous?.diagnostics ?? []), ...diagnostics],
    });

    if (sameReads) return;
    // 只替换读取边；Scope 对子元素的布局边不属于名称读取
    const dependencies = this.transaction.editNodeAttribute(node, 'dependencies');
    for (const [producer, kinds] of dependencies) {
      if (kinds.includes('layout')) dependencies.set(producer, ['layout']);
      else {
        this.transaction.editNodeAttribute(producer, 'consumers').delete(node);
        dependencies.delete(producer);
      }
    }
    for (const read of reads) {
      const producer = read.binding === undefined ? undefined : this.bindings.get(read.binding);
      // Composite 内部生成名称由实例自身完成，不建立实例级自依赖
      if (producer === undefined || producer === node) continue;
      const kinds = dependencies.get(producer) ?? [];
      if (!kinds.includes(read.kind)) dependencies.set(producer, [...kinds, read.kind]);
      this.transaction.editNodeAttribute(producer, 'consumers').add(node);
    }
  }

  /** 登记 Scope 包络对子元素布局的依赖，Path 不参与引用包络 */
  recordScopeLayoutDependencies(node: WeaveScopeNode): void {
    for (const dependency of this.transaction.readNode(node).children) {
      if (dependency.type === 'path') continue;
      const dependencies = this.transaction.editNodeAttribute(node, 'dependencies');
      const kinds = dependencies.get(dependency) ?? [];
      if (!kinds.includes('layout')) dependencies.set(dependency, [...kinds, 'layout']);
      if (!this.transaction.readNode(dependency).consumers.has(node))
        this.transaction.editNodeAttribute(dependency, 'consumers').add(node);
    }
  }

  /** 删除节点的双向计算关联与读取记录，不修改声明父子关系 */
  detachNodeDependencies(node: WeaveNode): void {
    const state = this.transaction.readNode(node);
    this.removed.add(node);
    this.dirtyNodes.delete(node);
    this.checkedNodes.delete(node);
    for (const read of this.transaction.readNode(this.root).records.get(node)?.reads ?? []) {
      const readers = this.transaction.editNodeAttribute(this.root, 'readers');
      const subscribers = new Set(readers.get(read.name));
      subscribers.delete(node);
      if (subscribers.size === 0) readers.delete(read.name);
      else readers.set(read.name, subscribers);
    }
    for (const producer of state.dependencies.keys())
      this.transaction.editNodeAttribute(producer, 'consumers').delete(node);
    for (const consumer of state.consumers) this.transaction.editNodeAttribute(consumer, 'dependencies').delete(node);
    this.transaction.editNodeAttribute(this.root, 'records').delete(node);
  }

  /** 最终确认后移除已不在提交树中的 binding，避免继续持有删除的节点 */
  pruneRemovedBindings(): void {
    for (const node of this.removed) this.bindings.delete(node);
  }

  /** 回滚后移除从未提交的新增节点 binding，保留原有节点绑定 */
  pruneUncommittedBindings(): void {
    for (const node of this.inserted) if (node.current === null) this.bindings.delete(node);
  }
}
