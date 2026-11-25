import type { CompileWarning } from '@retikz/core';
import { compareProperties } from '@retikz/foundation';

import type { WeaveCompileRead, WeaveEntry, WeaveRoot, WeaveScopeEntry } from '../shared';
import type { WeaveTransaction } from './transaction';

/** 维护编译读取、双向依赖与批次失效，不编辑声明结构或执行编译 */
export class WeaveTracker {
  /** 同批已隔离的名称订阅者集合，不与已提交版本共享可写引用 */
  private readonly editedSubscribers = new Map<string, Set<WeaveEntry>>();

  /** 本批已失效条目，用于传播去重与阻止缓存复用，不是待执行队列 */
  private readonly dirtyEntries = new Set<WeaveEntry>();
  /** 本批请求检查的条目，既包括直接失效，也包括仅需核对依赖读取的条目 */
  private readonly checkRequests = new Set<WeaveEntry>();

  /** 仅回收本批新增但未提交的身份 */
  private readonly inserted = new Set<WeaveEntry>();
  /** 提交成功后释放被移除的绑定 */
  private readonly removed = new Set<WeaveEntry>();

  /** 供调度器选择本批需要检查的条目 */
  get requestedEntries(): ReadonlySet<WeaveEntry> {
    return this.checkRequests;
  }

  constructor(
    private readonly root: WeaveRoot,
    private readonly transaction: WeaveTransaction,
    private readonly bindings: Map<object, WeaveEntry>,
  ) {}

  /** 将条目登记为可被 Core 读取记录引用的生产者 */
  registerEntryBinding(entry: WeaveEntry): void {
    this.bindings.set(entry, entry);
    this.inserted.add(entry);
  }

  /** 判断条目是否因自身变化或上游影响被本批选中 */
  isEntryAffected(entry: WeaveEntry): boolean {
    return this.dirtyEntries.has(entry) || this.checkRequests.has(entry);
  }

  /** 没有自身输入或继承变化，可以通过实际读取结果确认旧贡献 */
  canCheckEntry(entry: WeaveEntry): boolean {
    return !this.dirtyEntries.has(entry) && this.checkRequests.has(entry);
  }

  /** 名称声明变化同时唤醒未命中读取，不能只沿已有生产者边传播 */
  invalidateBindings(names: ReadonlySet<string>, changed: (entry: WeaveEntry) => boolean): void {
    const readers = this.transaction.readState(this.root).readers;
    const checked = new Set<WeaveEntry>();
    for (const name of names)
      for (const entry of readers.get(name) ?? []) {
        if (checked.has(entry)) continue;
        checked.add(entry);
        if (changed(entry)) this.requestEntryCheck(entry);
      }
  }

  /** 仅登记自身输入变化，后代环境与引用结果由读取点核对 */
  invalidateEntry(entry: WeaveEntry): void {
    if (this.dirtyEntries.has(entry)) return;
    this.dirtyEntries.add(entry);
    this.requestEntryCheck(entry);
  }

  /** 登记待检查条目，不立即执行检查或扩散消费依赖 */
  private requestEntryCheck(entry: WeaveEntry): void {
    this.checkRequests.add(entry);
  }

  /** 根据最新读取更新条目的双向依赖、名称订阅及读取与诊断记录 */
  updateEntryReadDependencies(
    entry: WeaveEntry,
    compileReads: ReadonlyArray<WeaveCompileRead>,
    diagnostics: ReadonlyArray<CompileWarning>,
    append = false,
  ): void {
    const oldRecord = this.transaction.readState(this.root).records.get(entry);
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
          compareProperties(old.kind, read.kind, { depth: 2 })
        );
      });
    // ⚡诊断按条目身份浅比较，不递归遍历任意 details；新条目保守刷新记录
    if (sameReads && compareProperties(oldRecord.diagnostics, diagnostics)) return;
    if (!sameReads) {
      const nextNames = new Set(reads.map(read => read.name));
      for (const read of oldRecord?.reads ?? [])
        if (!nextNames.has(read.name)) this.setSubscription(read.name, entry, false);
      for (const name of nextNames) this.setSubscription(name, entry, true);
    }
    this.transaction.editStateAttribute(this.root, 'records').set(entry, {
      reads,
      diagnostics: [...(previous?.diagnostics ?? []), ...diagnostics],
    });

    if (sameReads) return;
    // 只替换读取边；Scope 对子元素的布局边不属于名称读取
    const dependencies = this.transaction.editStateAttribute(entry, 'dependencies');
    for (const [producer, kinds] of dependencies) {
      if (kinds.includes('layout')) dependencies.set(producer, ['layout']);
      else {
        this.transaction.editStateAttribute(producer, 'consumers').delete(entry);
        dependencies.delete(producer);
      }
    }
    for (const read of reads) {
      const producer = read.binding === undefined ? undefined : this.bindings.get(read.binding);
      // Composite 内部生成名称由实例自身完成，不建立实例级自依赖
      if (producer === undefined || producer === entry) continue;
      const kinds = dependencies.get(producer) ?? [];
      if (!kinds.includes(read.kind)) dependencies.set(producer, [...kinds, read.kind]);
      this.transaction.editStateAttribute(producer, 'consumers').add(entry);
    }
  }

  /** ⚡成员关系变化才写入；同一名称在本批首次写入时复制一次 */
  private setSubscription(name: string, entry: WeaveEntry, present: boolean): void {
    const existing = this.transaction.readState(this.root).readers.get(name);
    if ((existing?.has(entry) ?? false) === present) return;
    const readers = this.transaction.editStateAttribute(this.root, 'readers');
    let subscribers = this.editedSubscribers.get(name);
    if (subscribers === undefined) {
      subscribers = new Set(existing);
      this.editedSubscribers.set(name, subscribers);
      readers.set(name, subscribers);
    }
    if (present) subscribers.add(entry);
    else {
      subscribers.delete(entry);
      if (subscribers.size === 0) {
        readers.delete(name);
        this.editedSubscribers.delete(name);
      }
    }
  }

  /** 更新 Scope 包络对子元素布局的双向依赖，Path 不参与引用包络 */
  updateScopeLayoutDependencies(entry: WeaveScopeEntry): void {
    for (const dependency of this.transaction.readState(entry).children) {
      if (dependency.type === 'path') continue;
      const dependencies = this.transaction.editStateAttribute(entry, 'dependencies');
      const kinds = dependencies.get(dependency) ?? [];
      if (!kinds.includes('layout')) dependencies.set(dependency, [...kinds, 'layout']);
      if (!this.transaction.readState(dependency).consumers.has(entry))
        this.transaction.editStateAttribute(dependency, 'consumers').add(entry);
    }
  }

  /** 删除条目的双向计算关联与读取记录，不修改声明父子关系 */
  detachEntryDependencies(entry: WeaveEntry): void {
    const state = this.transaction.readState(entry);
    this.removed.add(entry);
    this.dirtyEntries.delete(entry);
    this.checkRequests.delete(entry);
    for (const read of this.transaction.readState(this.root).records.get(entry)?.reads ?? [])
      this.setSubscription(read.name, entry, false);
    for (const producer of state.dependencies.keys())
      this.transaction.editStateAttribute(producer, 'consumers').delete(entry);
    for (const consumer of state.consumers) this.transaction.editStateAttribute(consumer, 'dependencies').delete(entry);
    this.transaction.editStateAttribute(this.root, 'records').delete(entry);
  }

  /** 最终确认后移除已不在提交树中的 binding，避免继续持有删除的条目 */
  pruneRemovedBindings(): void {
    for (const entry of this.removed) this.bindings.delete(entry);
  }

  /** 回滚后移除从未提交的新增条目 binding，保留原有条目绑定 */
  pruneUncommittedBindings(): void {
    for (const entry of this.inserted) if (entry.current === null) this.bindings.delete(entry);
  }
}
