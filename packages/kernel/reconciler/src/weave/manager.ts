import type { AnyCompositeDefinition, IRChild, IRScene, CanonicalScopeInheritance } from '@retikz/core';
import { resolveScopeInheritance } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import { createIdAllocator, isPropertyPathEqual } from '@retikz/foundation';

import type { CompileOptions, ExecuteOptions } from '../compile';
import { createSharedCompileContext, createCompileRuntime } from '../compile/runtime';
import type { CompileStageCache } from '../compile/runtime';
import { createCompileChildPath } from '../compile/shared';
import { CompileManager } from '../compile/tree';
import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../error';
import type { WeaveCompileRead } from './compile';
import { createWeaveBatchState } from './runtime';
import type { WeaveBatchState, WeaveCompilation, WeaveCompileContext, WeaveCompileState } from './runtime';
import type { WeaveBatch, WeaveNode, WeaveRoot, WeaveScopeNode } from './types';

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
        ids: new Map(),
        scopeIds: new Map(),
        records: new Map(),
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
      for (const operation of input.operations) {
        const changes = editor.applyOperation(
          operation,
          resolveScopeInheritance(batch.source, this.context.shared.registries.themeRegistry),
        );
        if (changes === undefined) continue;
        for (const node of changes.insertedNodes) tracker.registerNodeBinding(node);
        for (const node of changes.changedNodes) tracker.invalidateNode(node);
        // 子节点先解绑，避免清理子节点时重新编辑已丢弃的父 Scope
        for (let index = changes.removedNodes.length - 1; index >= 0; index--) {
          const node = changes.removedNodes[index];
          tracker.detachNodeDependencies(node);
          transaction.discardNode(node);
        }
        modified = true;
      }

      let prepared = { ...completed, visited: 0 };
      if (modified) {
        batch.source = {
          ...transaction.readNode(persistent.root).input,
          children: transaction.readNode(persistent.root).children.map(node => editor.serializeNodeDeclaration(node)),
        };
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

  /** 内部编译操作只能在活动候选批次中执行 */
  private get batch(): WeaveBatchState {
    const batch = this.state.batch;
    if (batch === undefined)
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave has no active compilation batch');
    return batch;
  }

  /** 以唯一执行器计算当前候选，Weave 仅提供阶段缓存与事务身份 */
  private execute(): WeaveCompilation<TComposite>['compilation'] {
    const batch = this.batch;
    const { transaction, editor, tracker } = batch;
    const root = this.state.persistent.root;
    const nodes = new Map<string, WeaveNode>();
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
          ? new Map<string, WeaveNode>()
          : inheritedIds;
      if (parent.type === 'root') transaction.editNode(parent).ids = ids;
      else if (transaction.readNode(parent).input.own.localNamespace) transaction.editNode(parent).ids = ids;
      for (const [index, child] of children.entries()) {
        const path = createCompileChildPath(prefix, index);
        const node = batch.updating ? parentState.children[index] : editor.createNode(child, parent, style);
        if (!batch.updating) tracker.registerNodeBinding(node);
        nodes.set(keyOf(path), node);
        const state = transaction.editNode(node);
        state.input = { ...state.input, context: style };
        state.pendingInputs = [];
        if (!('namespace' in child) && child.id !== undefined) ids.set(child.id, node);
        if (!('namespace' in child) && child.type === 'node') for (const id of child.aliasIds ?? []) ids.set(id, node);
        if (node.type === 'scope' && !('namespace' in child) && child.type === 'scope')
          visit(
            child.children,
            node,
            path,
            resolveScopeInheritance(child, this.context.shared.registries.themeRegistry, style, path),
            ids,
          );
      }
    };
    visit(
      batch.source.children,
      root,
      [],
      resolveScopeInheritance(batch.source, this.context.shared.registries.themeRegistry),
      new Map(),
    );
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
        // phase 由唯一遍历器固定，对应值直接保存为 Core 阶段产物
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
          const producer = sourcePath === undefined ? undefined : findProducer(sourcePath);
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
    const compilation = new CompileManager({ ...runtime, cache }).compileScene<TComposite>(batch.source);
    for (const node of nodes.values()) {
      if (node.type === 'scope') tracker.recordScopeLayoutDependencies(node);
      if (node.type === 'composite') batch.visited++;
    }
    return compilation;
  }
}
