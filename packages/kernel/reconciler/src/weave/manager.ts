import type { AnyCompositeDefinition, IRChild, IRScene, CanonicalScopeInheritance } from '@retikz/core';
import { resolveScopeInheritance } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import { createIdAllocator, isPropertyPathEqual } from '@retikz/foundation';

import type { CompileOptions, ExecuteOptions } from '../compile';
import type { CompileContribution } from '../compile/execution';
import { compileScene } from '../compile/execution';
import { createSharedCompileContext, createCompileRuntime } from '../compile/runtime';
import { createCompileChildPath } from '../compile/shared';
import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../error';
import type { CompileStageCache } from './cache';
import { executeWeaveUpdate } from './scheduler';
import type { WeaveUpdateRequest } from './scheduler';
import type { WeaveCompileRead } from './shared';
import type { WeaveBatch, WeaveNode, WeaveRoot, WeaveScopeNode } from './shared';
import { createWeaveBatchState, WeaveAddressIndex, WeaveLookup } from './state';
import type { WeaveBatchState, WeaveCompilation, WeaveCompileContext, WeaveCompileState } from './state';

/** 已准备的批次结果，发布者负责提交、最终确认或恢复 */
export type WeavePreparedUpdate<TComposite extends AnyCompositeDefinition = AnyCompositeDefinition> =
  WeaveCompilation<TComposite> & {
    /** 切换本批节点状态，仍保留恢复依据 */
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
        input: own,
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
    this.batch.transaction.editNodeAttribute(root, 'scopeIds').set(root.scopeId, root);
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
      persistent.completed = { root: persistent.root, visited: batch.visited, compilation };
      persistent.addresses = batch.addresses;
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
    let scope: WeaveRoot | WeaveScopeNode = this.state.persistent.root;
    for (const index of path) {
      const child: WeaveNode | undefined = scope.current?.children[index];
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

  /** 在既有树上准备一批更新；返回值与当前树在提交前互相隔离 */
  update(input: WeaveBatch, forceFull = false): WeavePreparedUpdate<TComposite> {
    const persistent = this.state.persistent;
    const completed = persistent.completed;
    if (completed === undefined)
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Mount Weave before updating');
    if (this.state.batch !== undefined)
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave tree already has a candidate');
    const batch = createWeaveBatchState(persistent, true, forceFull);
    this.state.batch = batch;
    const { transaction, editor, tracker } = batch;

    try {
      let modified = false;
      const changedNames = new Set<string>();
      for (const operation of input.operations) {
        const changes = editor.applyOperation(
          operation,
          resolveScopeInheritance(batch.source, this.context.shared.registries.themeRegistry),
        );
        if (changes === undefined) continue;
        batch.indexesChanged ||= changes.indexesChanged;
        const addresses = batch.addresses!;
        if (changes.structure !== undefined) {
          const parent = changes.structure.parent;
          const children = transaction
            .readNode(parent)
            .children.map(node => addresses.declaration(batch.source, node) ?? editor.serializeNodeDeclaration(node));
          batch.source =
            parent.type === 'root'
              ? { ...batch.source, children }
              : addresses.replaceDeclaration(batch.source, parent, transaction, children);
        } else {
          for (const node of changes.changedNodes)
            batch.source = addresses.replaceDeclaration(batch.source, node, transaction);
        }
        if (changes.indexesChanged)
          batch.addresses = new WeaveAddressIndex(
            persistent.root,
            transaction,
            addresses,
            new Set([...changes.changedNodes, ...changes.insertedNodes]),
            new Set(changes.removedNodes),
            changes.structure,
            node => tracker.invalidateNode(node),
          );
        if (changes.indexesChanged) editor.refreshIndexes(changes, batch.addresses!);
        for (const name of changes.names) changedNames.add(name);
        for (const node of changes.insertedNodes) tracker.registerNodeBinding(node);
        for (const node of [...changes.changedNodes, ...changes.insertedNodes, ...changes.removedNodes]) {
          tracker.invalidateNode(node);
        }
        for (let index = changes.removedNodes.length - 1; index >= 0; index--) {
          const node = changes.removedNodes[index];
          tracker.detachNodeDependencies(node);
          transaction.discardNode(node);
        }
        modified = true;
      }

      if (batch.indexesChanged)
        tracker.invalidateBindings(changedNames, node => {
          if (node.current === null || !batch.addresses!.paths.has(node)) return false;
          const reads = transaction.readNode(persistent.root).records.get(node)?.reads ?? [];
          const generated = (producer: Extract<WeaveNode, { type: 'composite' }>) =>
            producer.current?.contribution?.bindings ?? [];
          return reads.some(read => {
            if (!changedNames.has(read.name)) return false;
            const visibilities =
              node.type === 'composite'
                ? (['declaration', 'closed'] as const)
                : node.type === 'path'
                  ? (['closed'] as const)
                  : (['declaration'] as const);
            return visibilities.some(visibility => {
              const query = { consumer: node, name: read.name, visibility };
              const before = persistent.addresses!.names.lookup(query, generated, true);
              const after = batch.addresses!.names.lookup(query, generated);
              return before?.node !== after?.node || !isPropertyPathEqual(before?.path ?? [], after?.path ?? []);
            });
          });
        });

      let prepared = { ...completed, visited: 0 };
      if (modified || forceFull) {
        const compilation = this.execute();
        prepared = { root: persistent.root, visited: batch.visited, compilation };
      }
      let closed = false;
      return {
        ...prepared,
        commit: () => transaction.commit(),
        finish: () => {
          transaction.finish();
          persistent.completed = prepared;
          persistent.source = batch.source;
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

  /** 首次完整构建与后续受影响子图调度，共享阶段缓存及输出事务 */
  private execute(): WeaveCompilation<TComposite>['compilation'] {
    const batch = this.batch;
    const { transaction, editor, tracker } = batch;
    const root = this.state.persistent.root;
    let nodes = batch.addresses?.nodes ?? new WeaveLookup<string, WeaveNode>();
    let paths = batch.addresses?.paths ?? new Map<WeaveNode, PropertyPath>();
    const keyOf = (path: PropertyPath) => JSON.stringify(path);
    const visit = (
      children: ReadonlyArray<IRChild>,
      parent: WeaveRoot | WeaveScopeNode,
      prefix: PropertyPath,
      style: CanonicalScopeInheritance,
      inheritedIds: Map<string, WeaveNode>,
    ): void => {
      const parentState = transaction.editNode(parent);
      const ids =
        parent.type === 'root' || transaction.readNode(parent).input.own.localNamespace
          ? new WeaveLookup<string, WeaveNode>()
          : inheritedIds;
      if (parent.type === 'root') transaction.editNode(parent).ids = ids;
      else if (transaction.readNode(parent).input.own.localNamespace) transaction.editNode(parent).ids = ids;
      for (const [index, child] of children.entries()) {
        const path = createCompileChildPath(prefix, index);
        const node = batch.updating ? parentState.children[index] : editor.createNode(child, parent, style);
        if (!batch.updating) tracker.registerNodeBinding(node);
        nodes.set(keyOf(path), node);
        paths.set(node, path);
        if (batch.updating && !isPropertyPathEqual(batch.previousNodeIrPaths.get(node) ?? [], path))
          tracker.invalidateNode(node);
        if (!batch.updating) {
          const state = transaction.editNode(node);
          state.input = { ...state.input, context: style };
        }

        if (!('namespace' in child) && child.id !== undefined) ids.set(child.id, node);
        if (!('namespace' in child) && child.type === 'node') for (const id of child.aliasIds ?? []) ids.set(id, node);
        if (node.type === 'scope' && !('namespace' in child) && child.type === 'scope')
          visit(
            child.children,
            node,
            path,
            batch.updating
              ? transaction.readNode(node).input.context
              : resolveScopeInheritance(child, this.context.shared.registries.themeRegistry, style, path),
            ids,
          );
      }
    };
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
      nodes = batch.addresses.nodes;
      paths = batch.addresses.paths;
    }
    // 别名与生成内容路径归属最近的作者声明，不创建生成节点身份
    const findProducer = (path: PropertyPath): WeaveNode | undefined => {
      for (let length = path.length; length > 0; length--) {
        const node = nodes.get(keyOf(path.slice(0, length)));
        if (node !== undefined) return node;
      }
      return undefined;
    };
    const counted = new Set<WeaveNode>();
    const runtime = createCompileRuntime(batch.source, this.options, this.context.execution, this.context.shared);
    const cache: CompileStageCache = {
      read: (path, phase) => {
        const node = nodes.get(keyOf(path));
        if (node === undefined || batch.forceFull || !batch.updating) return;
        if (!isPropertyPathEqual(batch.previousNodeIrPaths.get(node) ?? [], path)) return;
        const metadata = transaction.readNode(node).cache;
        if (metadata === undefined || metadata.phase !== phase) return;
        switch (metadata.phase) {
          case 'node': {
            if (node.type !== 'node') return;
            const { canon, compiled } = transaction.readNode(node);
            if (canon !== null && compiled !== null) return { ...metadata, phase: 'node', value: { canon, compiled } };
            break;
          }
          case 'coordinate': {
            if (node.type !== 'coordinate') return;
            const { canon, compiled } = transaction.readNode(node);
            if (canon !== null && compiled !== null)
              return { ...metadata, phase: 'coordinate', value: { canon, compiled } };
            break;
          }
          case 'path': {
            if (node.type !== 'path') return;
            const { canon, compiled } = transaction.readNode(node);
            if (canon !== null && compiled !== null) return { ...metadata, phase: 'path', value: { canon, compiled } };
            break;
          }
          case 'scope': {
            if (node.type !== 'scope') return;
            const { canon, compiled } = transaction.readNode(node);
            if (canon !== null && compiled !== null) return { ...metadata, phase: 'scope', value: { canon, compiled } };
            break;
          }
        }
      },
      write: (path, record, reused) => {
        const node = nodes.get(keyOf(path));
        if (node === undefined) return;
        if (!reused && !counted.has(node)) {
          counted.add(node);
          batch.visited++;
        }
        const state = transaction.editNode(node);
        const { value: product, ...metadata } = record;
        void product;
        state.cache = metadata;
        // 阶段判别与节点类别一致，直接保存 Core 产物
        if (node.type === 'node' && record.phase === 'node') {
          const value = record.value;
          const shape = transaction.editNode(node);
          shape.canon = value.canon;
          shape.compiled = value.compiled;
        } else if (node.type === 'coordinate' && record.phase === 'coordinate') {
          const coordinate = transaction.editNode(node);
          coordinate.canon = record.value.canon;
          coordinate.compiled = record.value.compiled;
        } else if (node.type === 'path' && record.phase === 'path') {
          const pathState = transaction.editNode(node);
          pathState.canon = record.value.canon;
          pathState.compiled = record.value.compiled;
        } else if (node.type === 'scope' && record.phase === 'scope') {
          const scope = transaction.editNode(node);
          scope.canon = record.value.canon;
          scope.compiled = record.value.compiled;
        }
        const reads: Array<WeaveCompileRead> = record.reads.map(read => {
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
        tracker.recordNodeReads(node, reads, record.diagnostics);
      },
    };
    const contributions = {
      write: (path: PropertyPath, contribution: CompileContribution) => {
        const node = nodes.get(keyOf(path));
        if (node === undefined || node.type === 'scope') return;
        transaction.editNode(node).contribution = contribution;
        if (node.type !== 'composite') return;
        batch.visited++;
        tracker.recordNodeReads(
          node,
          contribution.reads.map(read => ({
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
      },
    };
    const retained = new Map<string, CompileContribution>();
    const pending = new Map<string, WeaveUpdateRequest>();
    const requested = batch.forceFull || !batch.updating ? paths.keys() : tracker.requests;
    for (const node of requested) {
      const path = keyOf(paths.get(node)!);
      const state = transaction.readNode(node);
      const affected =
        batch.forceFull || tracker.isNodeDirty(node) || state.pendingInputs.some(input => input.changes.size > 0);
      const request: WeaveUpdateRequest = {
        node,
        check:
          !batch.forceFull && tracker.canCheckNode(node) && state.contribution?.diagnostics.length === 0
            ? state.contribution
            : undefined,
        inputs: state.pendingInputs,
        consume: () => {
          transaction.editNode(node).pendingInputs = [];
        },
      };
      const contribution = state.contribution;
      if (node.type === 'scope') {
        pending.set(path, request);
      } else if (!affected && contribution !== undefined && contribution.diagnostics.length === 0)
        retained.set(path, contribution);
      else pending.set(path, request);
    }
    const candidate = { ...runtime, contributions, producer: (path: PropertyPath) => nodes.get(keyOf(path)) };
    const compilation = batch.updating
      ? executeWeaveUpdate<TComposite>(
          batch.source,
          candidate,
          cache,
          retained,
          pending,
          root,
          transaction,
          paths,
          batch.addresses.names,
        )
      : compileScene<TComposite>(batch.source, { ...candidate, stages: { write: cache.write } });
    if (!batch.updating || batch.indexesChanged)
      for (const node of batch.updating ? tracker.requests : nodes.values()) {
        if (node.type === 'scope') tracker.recordScopeLayoutDependencies(node);
      }
    return compilation;
  }
}
