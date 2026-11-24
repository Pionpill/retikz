import type { AnyCompositeDefinition, IRChild, IRScene, CanonicalScopeInheritance } from '@retikz/core';
import { resolveScopeInheritance } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import { createIdAllocator, isPropertyPathEqual } from '@retikz/foundation';

import type { CompileOptions, ExecuteOptions } from '../compile';
import { createCompileChildPath, createCompileRuntime, createSharedCompileContext } from '../compile';
import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../error';
import { executeWeaveCompilation } from './schedule';
import type { WeaveExecutionContext, WeaveUpdateRequest } from './schedule';
import type {
  WeaveBatch,
  WeaveCompileRead,
  WeaveContribution,
  WeaveEntry,
  WeaveReferenceRead,
  WeaveRoot,
  WeaveScopeEntry,
} from './shared';
import { createWeaveBatchState, WeaveAddressIndex, WeaveLookup } from './state';
import type { WeaveBatchState, WeaveCompilation, WeaveCompileContext, WeaveCompileState } from './state';

/** 已准备的批次结果，发布者负责提交、最终确认或恢复 */
export type WeavePreparedUpdate<TComposite extends AnyCompositeDefinition = AnyCompositeDefinition> =
  WeaveCompilation<TComposite> & {
    /** 切换本批条目状态，仍保留恢复依据 */
    commit: () => void;
    /** 发布成功后释放恢复依据 */
    finish: () => void;
    /** 放弃准备结果或恢复已提交状态 */
    rollback: () => void;
  };

/** 当前模块实例内的树编号分配器，用于生成各树独立的 scopeId 前缀 */
let nextTreeId = 0;

/** 管理 Weave 声明树、阶段缓存、依赖记录与候选事务；每次准备独占可变状态 */
export class WeaveManager<TComposite extends AnyCompositeDefinition = AnyCompositeDefinition> {
  /** 会话稳定配置，与可变批次分离 */
  private readonly context: WeaveCompileContext;
  /** 跨批次事实源与当前候选状态 */
  private readonly state: WeaveCompileState<TComposite>;

  /** 读取此会话持有的稳定声明根 */
  get root(): WeaveRoot {
    return this.state.persistent.root;
  }

  /** 内部编译操作只能在活动候选批次中执行 */
  private get batch(): WeaveBatchState {
    const batch = this.state.batch;
    if (batch === undefined)
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave has no active compilation batch');
    return batch;
  }

  constructor(
    source: IRScene,
    private readonly options: CompileOptions<TComposite> = {},
    execution: ExecuteOptions = {},
  ) {
    const shared = createSharedCompileContext(options);
    this.context = { shared, output: { padding: options.padding }, execution };
    const rootId = `weave-${nextTreeId++}`;
    const { children, ...own } = source;
    void children;
    const root: WeaveRoot = {
      type: 'root',
      scopeId: rootId,
      current: null,
      pending: {
        parent: null,
        origin: own,
        children: [],
        shared,
        ids: new WeaveLookup(),
        scopeIds: new Map(),
        records: new Map(),
        readers: new Map(),
      },
    };
    this.state = {
      persistent: { root, source, scopeIds: createIdAllocator(`${rootId}/scope`), bindings: new Map() },
      batch: undefined,
    };
    this.state.batch = createWeaveBatchState(this.state.persistent, false);
    this.batch.transaction.editStateAttribute(root, 'scopeIds').set(root.scopeId, root);
  }

  /** 首次编译基础树并组装可提交产物 */
  mount(): WeaveCompilation<TComposite> {
    const persistent = this.state.persistent;
    if (persistent.completed !== undefined)
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave is already mounted');
    const batch = this.batch;
    try {
      const compilation = this.execute();
      // 新树尚未对外发布；Runtime 再原子发布整棵树及输出
      batch.transaction.commit();
      batch.transaction.finish();
      persistent.completed = { visited: batch.visited, compilation };
      persistent.addresses = batch.addresses;
      // 作者树接管声明；后续只在需要完整 Source 配对时才物化子数组
      persistent.source = { ...batch.source, children: [] };
      this.state.batch = undefined;
      return persistent.completed;
    } catch (error) {
      batch.transaction.rollback();
      batch.tracker.pruneUncommittedBindings();
      this.state.batch = undefined;
      throw error;
    }
  }

  /** 按已提交作者树的逐层子元素下标查询 Scope；空路径返回根标识，不进入 Composite 生成树 */
  getScopeId(path: ReadonlyArray<number>): string {
    let scope: WeaveRoot | WeaveScopeEntry = this.state.persistent.root;
    for (const index of path) {
      const child: WeaveEntry | undefined = scope.current?.children[index];
      if (child?.type !== 'scope')
        throw new RetikzReconcilerError({
          code: RetikzReconcilerErrorCode.Contract,
          message: 'The scope path must address authored Scope elements',
          details: { path },
        });
      scope = child;
    }
    return scope.scopeId;
  }

  /**
   * 在已挂载的作者树上准备一批更新，不提交或发布中间结果
   * @description 先顺序编辑候选声明和索引，再统一调度编译；编辑或编译失败时回滚本批候选状态
   * @param input 按顺序应用的增删改操作，后续操作基于前序操作形成的候选结构寻址
   * @param forceFull 是否强制计算全部作者条目并禁用旧阶段产物复用，默认 false
   * @returns 编译快照及事务控制；commit 切换状态但保留恢复依据，finish 最终确认，rollback 放弃或恢复
   */
  update(input: WeaveBatch, forceFull = false): WeavePreparedUpdate<TComposite> {
    const persistent = this.state.persistent;
    const completed = persistent.completed;
    if (completed === undefined)
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Mount Weave before updating');
    if (this.state.batch !== undefined)
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave tree already has a candidate');

    /** 将本批输入、事务和强制全量策略保存到活动状态，供无参 execute 统一读取 */
    const batch = createWeaveBatchState(persistent, true, forceFull);
    this.state.batch = batch;
    const { transaction, editor, tracker } = batch;

    try {
      let modified = false;
      const changedNames = new Set<string>();

      /** 此处只编辑声明，不编译图元；每步同步候选输入和索引，保证后续操作看到最新结构 */
      for (const operation of input.operations) {
        const changes = editor.applyOperation(
          operation,
          resolveScopeInheritance(batch.source, this.context.shared.registries.themeRegistry),
        );
        if (changes === undefined) continue;
        batch.indexesChanged ||= changes.indexesChanged;
        const addresses = batch.addresses!;

        /** 名称或结构变化时刷新派生索引；路径移动也标记失效，避免复用旧声明位置相关的产物 */
        if (changes.indexesChanged)
          batch.addresses = new WeaveAddressIndex(
            persistent.root,
            transaction,
            addresses,
            new Set([...changes.changedEntries, ...changes.insertedEntries]),
            new Set(changes.removedEntries),
            changes.structure,
            entry => tracker.invalidateEntry(entry),
          );
        if (changes.indexesChanged) editor.refreshIndexes(changes, batch.addresses!);

        /** 登记新增身份和直接变化，暂不展开消费者依赖闭包，实际传播留给编译时的读取检查 */
        for (const name of changes.names) changedNames.add(name);
        for (const entry of changes.insertedEntries) tracker.registerEntryBinding(entry);
        for (const entry of [...changes.changedEntries, ...changes.insertedEntries, ...changes.removedEntries]) {
          tracker.invalidateEntry(entry);
        }

        /** 移除列表按父先子后排列，逆序断开依赖并剔除待提交项，保留旧树的结构回滚依据 */
        for (let index = changes.removedEntries.length - 1; index >= 0; index--) {
          const entry = changes.removedEntries[index];
          tracker.detachEntryDependencies(entry);
          transaction.discardEntry(entry);
        }
        modified = true;
      }

      /** 全部编辑结束后比较最终名称绑定，连同旧的未命中订阅一起检查，忽略批次中的临时改名 */
      if (batch.indexesChanged)
        tracker.invalidateBindings(changedNames, entry => {
          if (entry.current === null || !batch.addresses!.paths.has(entry)) return false;
          const reads = transaction.readState(persistent.root).records.get(entry)?.reads ?? [];
          const generated = (producer: Extract<WeaveEntry, { type: 'composite' }>) =>
            producer.current?.contribution?.bindings ?? [];
          return reads.some(read => {
            if (!changedNames.has(read.name)) return false;
            const visibilities =
              entry.type === 'composite'
                ? (['declaration', 'closed'] as const)
                : entry.type === 'path'
                  ? (['closed'] as const)
                  : (['declaration'] as const);
            return visibilities.some(visibility => {
              const query = { consumer: entry, name: read.name, visibility };
              const before = persistent.addresses!.names.lookup(query, generated, true);
              const after = batch.addresses!.names.lookup(query, generated);
              return before?.entry !== after?.entry || !isPropertyPathEqual(before?.path ?? [], after?.path ?? []);
            });
          });
        });

      /** 没有声明编辑且未强制全量时沿用已有快照，否则只在此统一启动一次编译调度 */
      let prepared = { ...completed, visited: 0 };
      if (modified || forceFull) {
        if (this.options.compositeInputs !== undefined)
          batch.source = {
            ...batch.source,
            children: transaction
              .readState(persistent.root)
              .children.map(entry => editor.serializeEntryDeclaration(entry)),
          };
        const compilation = this.execute();
        prepared = { visited: batch.visited, compilation };
      }

      /** commit 后仍可恢复；只有发布成功后的 finish 才保存本批输入、索引和结果并释放候选 */
      let closed = false;
      return {
        ...prepared,
        commit: () => transaction.commit(),
        finish: () => {
          transaction.finish();
          persistent.completed = prepared;
          persistent.addresses = batch.addresses;
          closed = true;
          tracker.pruneRemovedBindings();
          this.state.batch = undefined;
        },
        rollback: () => {
          if (closed) return;
          transaction.rollback();
          closed = true;
          tracker.pruneUncommittedBindings();
          this.state.batch = undefined;
        },
      };
    } catch (error) {
      transaction.rollback();
      tracker.pruneUncommittedBindings();
      this.state.batch = undefined;
      throw error;
    }
  }

  /**
   * 组织当前候选批次的编译并返回尚未提交的 Scene 快照
   * @description 从活动批次读取挂载或更新状态及 forceFull 策略，准备作者树、任务与复用资格，
   * 委托调度器推进实际计算，并通过回调回写候选缓存、输出贡献和依赖；本方法不提交或发布结果
   */
  private execute(): WeaveCompilation<TComposite>['compilation'] {
    const batch = this.batch;
    const { transaction, editor, tracker } = batch;
    const root = this.state.persistent.root;
    let entries = batch.addresses?.entries ?? new WeaveLookup<string, WeaveEntry>();
    let paths = batch.addresses?.paths ?? new Map<WeaveEntry, PropertyPath>();
    const keyOf = (path: PropertyPath) => JSON.stringify(path);

    /** 建立作者条目、继承上下文与名称索引，不展开 Composite 生成树，也不执行图元计算 */
    const visit = (
      children: ReadonlyArray<IRChild>,
      parent: WeaveRoot | WeaveScopeEntry,
      prefix: PropertyPath,
      style: CanonicalScopeInheritance,
      inheritedIds: Map<string, WeaveEntry>,
    ): void => {
      const parentState = transaction.editState(parent);
      const ids =
        parent.type === 'root' || transaction.readState(parent).origin.own.localNamespace
          ? new WeaveLookup<string, WeaveEntry>()
          : inheritedIds;
      if (parent.type === 'root') transaction.editState(parent).ids = ids;
      else if (transaction.readState(parent).origin.own.localNamespace) transaction.editState(parent).ids = ids;
      for (const [index, child] of children.entries()) {
        const path = createCompileChildPath(prefix, index);
        const entry = batch.updating ? parentState.children[index] : editor.createEntry(child, parent, style);
        if (!batch.updating) tracker.registerEntryBinding(entry);
        entries.set(keyOf(path), entry);
        paths.set(entry, path);
        if (batch.updating && !isPropertyPathEqual(batch.previousEntryIrPaths.get(entry) ?? [], path))
          tracker.invalidateEntry(entry);
        if (!batch.updating) {
          const state = transaction.editState(entry);
          state.origin = { ...state.origin, context: style };
        }

        if (!('namespace' in child) && child.id !== undefined) ids.set(child.id, entry);
        if (!('namespace' in child) && child.type === 'node') for (const id of child.aliasIds ?? []) ids.set(id, entry);
        if (entry.type === 'scope' && !('namespace' in child) && child.type === 'scope')
          visit(
            child.children,
            entry,
            path,
            batch.updating
              ? transaction.readState(entry).origin.context
              : resolveScopeInheritance(child, this.context.shared.registries.themeRegistry, style, path),
            ids,
          );
      }
    };

    /** 仅首轮挂载需要从输入建立作者树；更新直接沿用前序操作已经编辑好的候选树和索引 */
    if (!batch.updating)
      visit(
        batch.source.children,
        root,
        [],
        resolveScopeInheritance(batch.source, this.context.shared.registries.themeRegistry),
        new Map(),
      );
    if (batch.addresses === undefined) {
      batch.addresses = new WeaveAddressIndex(root, transaction);
      entries = batch.addresses.entries;
      paths = batch.addresses.paths;
    }

    /** 将读取路径归属到最近的作者条目；别名和 Composite 生成内容不另建条目身份 */
    const findProducer = (path: PropertyPath): WeaveEntry | undefined => {
      for (let length = path.length; length > 0; length--) {
        const entry = entries.get(keyOf(path.slice(0, length)));
        if (entry !== undefined) return entry;
      }
      return undefined;
    };

    /** 按作者身份去重实际计算计数，避免同一条目的多个阶段重复增加 visited */
    const counted = new Set<WeaveEntry>();
    const runtime = createCompileRuntime(batch.source, this.options, this.context.execution, this.context.shared);

    /** 分别保存缓存和条目读取事实，再重建实际依赖；仅更新输出诊断时显式沿用旧读取数组 */
    const recordComputed: WeaveExecutionContext['recordComputed'] = (entry, metadata, reused, referenceReads) => {
      if (!reused && !counted.has(entry)) {
        counted.add(entry);
        batch.visited++;
      }
      const state = transaction.editState(entry);
      state.compile = metadata;
      state.referenceReads = referenceReads;
      const reads: Array<WeaveCompileRead> = referenceReads.map(read => {
        const sourcePath = read.entry?.irPath;
        const producer =
          read.entry?.producer === undefined
            ? sourcePath === undefined
              ? undefined
              : findProducer(sourcePath)
            : this.state.persistent.bindings.get(read.entry.producer);
        return {
          name: read.name,
          kind: read.kind,
          state: read.entry === undefined ? 'missing' : read.entry.state === 'resolved' ? 'ready' : 'pending',
          binding: producer,
        };
      });
      tracker.updateEntryReadDependencies(entry, reads, metadata.diagnostics);
    };

    /** 保存局部输出与独立的条目读取事实；Composite 在此补记分阶段依赖和计算计数 */
    const writeContribution = (
      entry: WeaveEntry,
      contribution: WeaveContribution,
      referenceReads: ReadonlyArray<WeaveReferenceRead>,
    ): void => {
      if (entry.type === 'scope') return;
      const state = transaction.editState(entry);
      state.contribution = contribution;
      state.referenceReads = referenceReads;
      if (entry.type !== 'composite') return;
      if (!counted.has(entry)) {
        counted.add(entry);
        batch.visited++;
      }
      tracker.updateEntryReadDependencies(
        entry,
        referenceReads.map(read => ({
          name: read.name,
          kind: read.kind,
          state: read.entry === undefined ? 'missing' : read.entry.state === 'resolved' ? 'ready' : 'pending',
          binding:
            read.entry === undefined
              ? undefined
              : read.entry.producer === undefined
                ? findProducer(read.entry.irPath)
                : this.state.persistent.bindings.get(read.entry.producer),
        })),
        contribution.diagnostics,
      );
    };

    /** 初始选中条目中可直接保留的清洁输出贡献 */
    const retained = new Map<string, WeaveContribution>();
    /** 待计算或待验证的声明，进入此集合不代表其全部阶段都需要重算 */
    const pending = new Map<string, WeaveUpdateRequest>();

    /** 首轮及 full 选择全部作者条目，auto 仅选择已登记变化 */
    const requested = !batch.updating || batch.forceFull ? paths.keys() : tracker.requests;
    for (const entry of requested) {
      const path = keyOf(paths.get(entry)!);
      const state = transaction.readState(entry);
      const affected =
        batch.forceFull || tracker.isEntryAffected(entry) || state.pendingInputs.some(input => input.changes.size > 0);
      const contribution = 'contribution' in state ? state.contribution : undefined;
      const request: WeaveUpdateRequest = {
        entry,
        check:
          !batch.forceFull && tracker.canCheckEntry(entry) && contribution?.diagnostics.length === 0
            ? contribution
            : undefined,
        inputs: state.pendingInputs,
        consume: () => {
          transaction.editState(entry).pendingInputs = [];
        },
      };

      /** Scope 需要等待子布局再确认包络；其他元素可保留清洁贡献或交由调度器进一步核对 */
      if (entry.type === 'scope') {
        pending.set(path, request);
      } else if (!affected && contribution !== undefined && contribution.diagnostics.length === 0)
        retained.set(path, contribution);
      else pending.set(path, request);
    }

    /** 调度器通过这些能力读取候选状态并回写结果，不在此切换已提交状态槽 */
    const context = {
      indexesChanged: batch.indexesChanged,
      hasBoundInputs: this.options.compositeInputs !== undefined,
      source: batch.source,
      runtime,
      recordComputed,
      writeContribution,
      root,
      transaction,
      paths,
      names: batch.addresses.names,
    };

    /** 首轮、full 与 auto 共用调度器；仅 auto 可复用与当前声明位置兼容的阶段产物 */
    const compilation = executeWeaveCompilation<TComposite>(context, {
      canReuse: entry => {
        if (!batch.updating || batch.forceFull) return false;
        if (isPropertyPathEqual(batch.previousEntryIrPaths.get(entry) ?? [], paths.get(entry)!)) return true;
        if (entry.type !== 'node') return false;
        const state = transaction.readState(entry);
        const canon = state.resolve?.value;
        // ⚡绝对定位、纯色且无文本的节点不捕获地址；仍用新位置组装绑定、来源和输出
        return (
          canon != null &&
          state.resolve?.input === state.origin.own &&
          Array.isArray(canon.layout.position) &&
          typeof canon.style.fill === 'string' &&
          typeof canon.style.stroke === 'string' &&
          canon.text === undefined &&
          canon.labels.length === 0 &&
          state.referenceReads.length === 0 &&
          state.compile?.diagnostics.length === 0 &&
          state.contribution?.diagnostics.length === 0
        );
      },
      retained,
      pending,
    });

    /** 挂载或声明索引变化后补齐 Scope 对子布局的聚合依赖，仅属性更新时沿用既有结构依赖 */
    if (!batch.updating || batch.indexesChanged)
      for (const entry of batch.updating ? tracker.requests : entries.values()) {
        if (entry.type === 'scope') tracker.updateScopeLayoutDependencies(entry);
      }
    return compilation;
  }
}
