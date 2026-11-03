import type {
  CompileCompositeOptions,
  CompiledNodeLayout,
  CompileOccurrenceLocator,
  CompileOptions,
  CompileOutput,
  CompileOwnerKey,
  ExecuteOptions,
  IRChild,
  IRScene,
  IRScope,
  Transform,
} from '@retikz/core';
import {
  assembleScopeOutput,
  withCompileWarningOccurrence,
  createSharedCompileContext,
  createCompileChildPath,
  projectCompileReference,
  projectPublishedCompileLayout,
  projectScopeCompileLayouts,
  resolveScopeStyle,
} from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import { createIdAllocator, isPropertyPathEqual, jsonStructuralEquals } from '@retikz/foundation';

import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../error';
import { lookupWeaveBinding, runWeaveCompilation } from './compile';
import type { WeaveCompileOptions, WeaveCompileResult } from './compile';
import {
  compileWeaveCoordinate,
  compileWeaveNode,
  compileWeavePath,
  compileWeaveScope,
  prepareWeaveScope,
} from './element';
import { createWeaveNamespaceRegistry } from './namespace';
import type { WeaveNamespaceRegistry } from './namespace';
import { assembleWeaveCompilation } from './output';
import { createWeaveBatchState } from './runtime';
import type { WeaveBatchState, WeaveCompilation, WeaveCompileContext, WeaveCompileState } from './runtime';
import type {
  WeaveBatch,
  WeaveCoordinateNode,
  WeaveNode,
  WeavePathNode,
  WeaveRoot,
  WeaveScopeNode,
  WeaveShapeNode,
} from './types';

/** 已准备的批次结果，发布者负责提交、最终确认或恢复 */
export type WeavePreparedUpdate = WeaveCompilation & {
  /** 切换本批节点状态，仍保留恢复依据 */
  commit: () => void;
  /** 发布成功后释放恢复依据 */
  finish: () => void;
  /** 放弃准备结果或恢复已提交状态 */
  rollback: () => void;
};

/** 已发布几何及其名称 frame，用于 Scope 收尾时投影 */
type Publication = {
  /** 所属名称 frame */
  namespaceRegistry: WeaveNamespaceRegistry;
  /** 绑定对应的候选节点 */
  node: WeaveNode;
  /** 当前已发布坐标系中的布局 */
  layout: CompiledNodeLayout;
};

/** 一层声明容器的遍历上下文，递归时独立创建 */
type WeaveContainerCompileContext = {
  /** 子元素所属的声明容器 */
  parent: WeaveRoot | WeaveScopeNode;
  /** 当前可见的名称注册表 */
  namespaceRegistry: WeaveNamespaceRegistry;
  /** 当前命名空间的用户 id 索引，key 为声明 id，value 为对应的稳定节点对象 */
  ids: Map<string, WeaveNode>;
  /** 子元素共享的继承、变换与祖先约束 */
  options: Omit<WeaveCompileOptions, 'shared'>;
  /** 容器的来源归属 */
  owner: CompileOwnerKey;
  /** 子声明路径前缀 */
  prefix: PropertyPath;
};

/** 单个声明元素的编译调用与来源上下文 */
type WeaveElementCompileContext = {
  /** 所属容器的遍历上下文 */
  container: WeaveContainerCompileContext;
  /** 本元素的 Core 调用参数与明确来源位置 */
  options: WeaveCompileOptions & { occurrence: CompileOccurrenceLocator };
  /** 本元素的发射归属 */
  owner: CompileOwnerKey;
};

/** 当前模块实例内的树编号分配器，用于生成各树独立的 scopeId 前缀 */
let nextTreeId = 0;

/** 判断输入是否全部为基础元素，不运行 Composite 或解释其输出 */
export const isWeaveScene = (source: IRScene): boolean => {
  const visit = (children: ReadonlyArray<IRChild>): boolean =>
    children.every(child => !('namespace' in child) && (child.type !== 'scope' || visit(child.children)));
  return visit(source.children);
};

/** 协调声明树、Core 编译与依赖记录；当前每次准备独占可变状态 */
export class WeaveReconciler {
  /** 会话稳定配置，与可变批次分离 */
  private readonly context: WeaveCompileContext;
  /** 跨批次事实源与当前候选状态 */
  private readonly state: WeaveCompileState;

  constructor(
    source: IRScene,
    options: Omit<CompileOptions, keyof CompileCompositeOptions> = {},
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
  mount(): WeaveCompilation {
    const persistent = this.state.persistent;
    if (persistent.completed !== undefined)
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave is already mounted');
    const batch = this.batch;
    try {
      const result = this.reconcileChildren();
      const compilation = assembleWeaveCompilation({
        root: batch.source,
        outputs: result.outputs(),
        shared: this.context.shared,
        diagnostics: batch.diagnosticCollector.warnings,
        provenanceTracker: batch.provenanceTracker,
        padding: this.context.output.padding,
      });
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

  /** 在既有树上准备一批更新；返回值与当前树在提交前互相隔离 */
  update(input: WeaveBatch, forceFull = false): WeavePreparedUpdate {
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
          resolveScopeStyle(batch.source, this.context.shared.registries.themeRegistry),
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
        // 输出遍历重放名称声明，避免把最终名称表当成声明位置的引用环境
        transaction.editNode(persistent.root).ids = new Map();
        const result = this.reconcileChildren();
        const compilation = assembleWeaveCompilation({
          root: batch.source,
          outputs: result.outputs(),
          shared: this.context.shared,
          diagnostics: batch.diagnosticCollector.warnings,
          provenanceTracker: batch.provenanceTracker,
          padding: this.context.output.padding,
        });
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
      batch.tracker.pruneUncommittedBindings();
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

  /** 校验当前位置的缓存输入及实际名称绑定，不用旧索引推断新引用 */
  private canNodeReuse(node: WeaveNode, compileOptions: WeaveCompileOptions): boolean {
    if (this.batch.forceFull || !this.batch.updating || node.current === null || this.batch.tracker.isNodeDirty(node))
      return false;
    if (
      !isPropertyPathEqual(this.batch.previousNodeIrPaths.get(node) ?? [], compileOptions.irPath) ||
      !jsonStructuralEquals(node.current.input.context, compileOptions.style)
    )
      return false;
    const records = this.batch.transaction.readNode(this.state.persistent.root).records.get(node);
    if (records === undefined || records.diagnostics.length > 0) return false;
    const names = new Map(records.reads.map(read => [read.name, read.binding]));
    for (const [name, binding] of names) {
      const entry = lookupWeaveBinding(compileOptions.namespace, name);
      if (entry !== undefined && entry.state !== 'ready') return false;
      if (entry?.binding !== binding) return false;
    }
    return true;
  }

  /** 复用只读产物，重新归属读取事实及双向关系 */
  private reuseCompiledNode<T>(node: WeaveNode, compiled: T, compileOptions: WeaveCompileOptions): T {
    return this.recordCompilation(node, {
      status: 'compiled',
      compiled,
      reads: this.batch.tracker.refreshCompileReads(
        this.batch.transaction.readNode(this.state.persistent.root).records.get(node)?.reads ?? [],
        compileOptions,
      ),
      diagnostics: [],
    });
  }

  /** 保存本元素读取与诊断，建立本版本双向计算关联 */
  private recordCompilation<T>(node: WeaveNode, result: WeaveCompileResult<T>, append = false): T {
    this.batch.tracker.recordNodeReads(
      node,
      result.reads,
      result.status === 'compiled' ? result.diagnostics : [],
      append,
    );
    // 兜底报错，逻辑上不会走到这里
    if (result.status === 'pending') {
      throw new RetikzReconcilerError(
        RetikzReconcilerErrorCode.Compile,
        'Weave compilation has unresolved dependencies',
        { details: { names: result.reads.map(read => read.name) } },
      );
    }
    for (const warning of result.diagnostics) this.batch.diagnosticCollector.collect(warning);
    return result.compiled;
  }

  /** 只从已完成的局部编译状态投影引用几何 */
  private projectNodeReference(node: WeaveNode, transforms: ReadonlyArray<Transform>): CompiledNodeLayout {
    switch (node.type) {
      case 'node': {
        const compiled = this.batch.transaction.readNode(node).compiled;
        if (compiled !== null)
          return projectCompileReference({ type: 'node', compiled }, this.context.shared.registries, transforms);
        break;
      }
      case 'coordinate': {
        const compiled = this.batch.transaction.readNode(node).compiled;
        if (compiled !== null)
          return projectCompileReference({ type: 'coordinate', compiled }, this.context.shared.registries, transforms);
        break;
      }
      case 'scope': {
        const compiled = this.batch.transaction.readNode(node).compiled;
        if (compiled !== null)
          return projectCompileReference({ type: 'scope', compiled }, this.context.shared.registries, transforms);
        break;
      }
    }
    throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Compile, 'Cannot publish an unfinished reference');
  }

  /** 登记引用名称及用户索引，并归集重名诊断 */
  private registerReference(
    node: WeaveNode,
    name: string,
    path: PropertyPath,
    element: WeaveElementCompileContext,
  ): void {
    const { namespaceRegistry, ids } = element.container;
    const compileOptions = element.options;
    const warningCount = this.batch.diagnosticCollector.warnings.length;
    namespaceRegistry.register(
      name,
      this.batch.transaction.readNode(node).compiled === null
        ? { state: 'pending', binding: node }
        : {
            state: 'ready',
            binding: node,
            irPath: compileOptions.irPath,
            layout: this.projectNodeReference(node, compileOptions.transforms ?? []),
          },
      path,
      compileOptions.occurrence,
    );
    ids.set(name, node);
    const entry = this.batch.transaction.readNode(this.state.persistent.root).records.get(node);
    if (entry !== undefined && this.batch.diagnosticCollector.warnings.length > warningCount) {
      this.batch.transaction.editNodeAttribute(this.state.persistent.root, 'records').set(node, {
        ...entry,
        diagnostics: [...entry.diagnostics, ...this.batch.diagnosticCollector.warnings.slice(warningCount)],
      });
    }
  }

  /** 收集局部输出副本，保留每个声明元素独立的发射来源 */
  private collectOutput(
    output: CompileOutput | undefined,
    role: string,
    owner: CompileOwnerKey,
  ): CompileOutput | undefined {
    if (output === undefined) return;
    const contribution = {
      ...output,
      primitives: this.batch.provenanceTracker.materializePrimitives(output.primitives),
    };
    this.batch.provenanceTracker.recordPrimitives(contribution.primitives, owner, role);
    return contribution;
  }

  /** 编译 Node，登记读取与引用并准备局部输出 */
  private reconcileNode(
    node: WeaveShapeNode,
    element: WeaveElementCompileContext,
  ): { output: CompileOutput | undefined; layout: CompiledNodeLayout; publication: Publication } {
    const state = this.batch.transaction.editNode(node);
    const { options, container, owner } = element;
    if (!this.canNodeReuse(node, options) || state.compiled === null) {
      this.batch.tracker.invalidateNode(node);
      this.batch.visited++;
      state.compiled = this.recordCompilation(
        node,
        runWeaveCompilation(options, elementRuntime => compileWeaveNode(state.input.own, elementRuntime)),
      );
    } else state.compiled = this.reuseCompiledNode(node, state.compiled, options);
    state.input = { ...state.input, context: options.style };
    state.pendingInputs = [];
    if (state.input.own.id) {
      this.registerReference(node, state.input.own.id, [...options.irPath, 'id'], element);
      state.input.own.aliasIds?.forEach((id, index) =>
        this.registerReference(node, id, [...options.irPath, 'aliasIds', index], element),
      );
    }
    return {
      output: this.collectOutput(state.compiled.output, 'node', owner),
      layout: state.compiled.layout,
      publication: {
        namespaceRegistry: container.namespaceRegistry,
        node,
        layout: this.projectNodeReference(node, options.transforms ?? []),
      },
    };
  }

  /** 编译 Coordinate，登记读取与引用 */
  private reconcileCoordinate(
    node: WeaveCoordinateNode,
    element: WeaveElementCompileContext,
  ): { output: CompileOutput | undefined; layout: CompiledNodeLayout; publication: Publication } {
    const state = this.batch.transaction.editNode(node);
    const { options, container } = element;
    if (!this.canNodeReuse(node, options) || state.compiled === null) {
      this.batch.tracker.invalidateNode(node);
      this.batch.visited++;
      state.compiled = this.recordCompilation(
        node,
        runWeaveCompilation(options, elementRuntime => compileWeaveCoordinate(state.input.own, elementRuntime)),
      );
    } else state.compiled = this.reuseCompiledNode(node, state.compiled, options);
    state.input = { ...state.input, context: options.style };
    state.pendingInputs = [];
    this.registerReference(node, state.compiled.id, [...options.irPath, 'id'], element);
    return {
      output: undefined,
      layout: this.projectNodeReference(node, []),
      publication: {
        namespaceRegistry: container.namespaceRegistry,
        node,
        layout: this.projectNodeReference(node, options.transforms ?? []),
      },
    };
  }

  /** 在容器引用几何就绪后编译 Path 并收集其输出 */
  private reconcilePath(
    node: WeavePathNode,
    element: WeaveElementCompileContext,
    transforms?: ReadonlyArray<Transform>,
  ): CompileOutput | undefined {
    const state = this.batch.transaction.editNode(node);
    const compileOptions = element.options;
    if (!this.canNodeReuse(node, compileOptions) || state.compiled === null) {
      this.batch.visited++;
      state.compiled = this.recordCompilation(
        node,
        runWeaveCompilation(
          { ...compileOptions, transforms: transforms ?? compileOptions.transforms },
          elementRuntime => compileWeavePath(state.input.own, elementRuntime),
        ),
      );
    } else state.compiled = this.reuseCompiledNode(node, state.compiled, compileOptions);
    state.input = { ...state.input, context: compileOptions.style };
    state.pendingInputs = [];
    return this.collectOutput(state.compiled.output, 'path', element.owner);
  }

  /** 依次完成 Scope 准备、子树、包络、引用投影与输出包装 */
  private reconcileScope(
    node: WeaveScopeNode,
    child: IRScope,
    element: WeaveElementCompileContext,
  ): { output: CompileOutput; layouts: Array<CompiledNodeLayout>; publications: Array<Publication> } {
    const state = this.batch.transaction.editNode(node);
    const { namespaceRegistry, ids, options: context } = element.container;
    const { options: compileOptions, owner: semanticOwner } = element;
    const occurrence = compileOptions.occurrence;
    const irPath = compileOptions.irPath;
    const reusable = this.canNodeReuse(node, compileOptions);
    const previousCompiled = state.compiled;
    const previousReads = this.batch.transaction.readNode(this.state.persistent.root).records.get(node)?.reads ?? [];
    if (!reusable) this.batch.tracker.invalidateNode(node);
    state.compiled = null;
    state.input = { ...state.input, context: compileOptions.style };
    state.pendingInputs = [];
    if (child.localNamespace) state.ids = new Map();
    else delete state.ids;
    // 进入准备阶段
    const prepared = this.recordCompilation(
      node,
      runWeaveCompilation(compileOptions, elementRuntime => prepareWeaveScope(state.input.own, elementRuntime)),
    );
    if (child.id !== undefined) this.registerReference(node, child.id, [...irPath, 'id'], element);
    const nestedNamespaceRegistry = child.localNamespace
      ? createWeaveNamespaceRegistry(namespaceRegistry.namespace, this.batch.diagnosticCollector.collect)
      : namespaceRegistry;
    const preliminary = prepared.preliminaryTransforms ?? [];
    const nested = this.reconcileChildren(child.children, {
      parent: node,
      namespaceRegistry: nestedNamespaceRegistry,
      ids: state.ids === undefined ? ids : this.batch.transaction.editNodeAttribute(node, 'ids'),
      options: {
        ...context,
        irPath,
        occurrence,
        style: prepared.scope,
        transforms: [...(context.transforms ?? []), ...preliminary],
        ancestorScopes: new Set([...(context.ancestorScopes ?? []), node]),
      },
      owner: semanticOwner,
      prefix: irPath,
    });
    if (reusable && previousCompiled !== null && !this.batch.tracker.isNodeDirty(node))
      state.compiled = this.recordCompilation(node, {
        status: 'compiled',
        compiled: previousCompiled,
        reads: this.batch.tracker.refreshCompileReads(previousReads, compileOptions),
        diagnostics: [],
      });
    else {
      this.batch.visited++;
      state.compiled = this.recordCompilation(
        node,
        runWeaveCompilation(compileOptions, elementRuntime =>
          compileWeaveScope(state.input.own, prepared, nested.layouts, elementRuntime),
        ),
        true,
      );
    }
    this.batch.tracker.recordScopeLayoutDependencies(node);
    const transforms = state.compiled.group.transforms ?? [];
    const postTransforms =
      prepared.preliminaryTransforms === undefined
        ? transforms
        : transforms.slice(0, transforms.length - preliminary.length);
    for (const publication of nested.publications) {
      publication.layout = projectPublishedCompileLayout(publication.layout, context.transforms ?? [], postTransforms);
      publication.namespaceRegistry.replace(publication.node, {
        state: 'ready',
        binding: publication.node,
        irPath: this.batch.transaction.readNode(publication.node).compiled?.irPath,
        layout: publication.layout,
      });
    }
    const publications = [...nested.publications];
    if (child.id !== undefined)
      namespaceRegistry.replace(node, {
        state: 'ready',
        binding: node,
        irPath: state.compiled.irPath,
        layout: this.projectNodeReference(node, context.transforms ?? []),
      });
    const layouts = projectScopeCompileLayouts(child, state.compiled.envelope, nested.layouts, transforms);
    const output = assembleScopeOutput(
      state.compiled,
      nested.outputs([...(context.transforms ?? []), ...transforms]),
      {
        round: this.context.shared.layout.round,
        maxClipDepth: this.context.shared.limits.maxClipDepth,
        onWarn: warning => this.batch.diagnosticCollector.collect(withCompileWarningOccurrence(warning, occurrence)),
      },
      state.input.own,
      this.batch.provenanceTracker,
      semanticOwner,
    );
    publications.push({ namespaceRegistry, node, layout: this.projectNodeReference(node, context.transforms ?? []) });
    return { output, layouts, publications };
  }

  /** 保持 Core 的声明可见性顺序，Path 在所属容器收尾后计算 */
  private reconcileChildren(
    input: ReadonlyArray<IRChild> = this.batch.source.children,
    container: WeaveContainerCompileContext = {
      parent: this.state.persistent.root,
      namespaceRegistry: this.batch.namespace,
      ids: this.batch.transaction.editNodeAttribute(this.state.persistent.root, 'ids'),
      options: {
        style: resolveScopeStyle(this.batch.source, this.context.shared.registries.themeRegistry),
        irPath: [],
      },
      owner: this.batch.provenanceTracker.root,
      prefix: [],
    },
  ): {
    outputs: (transforms?: ReadonlyArray<Transform>) => Array<CompileOutput>;
    layouts: Array<CompiledNodeLayout>;
    publications: Array<Publication>;
  } {
    const { parent, namespaceRegistry, ids, options: context, owner, prefix } = container;
    const outputs = new Map<WeaveNode, CompileOutput | undefined>();
    const layouts: Array<CompiledNodeLayout> = [];
    const publications: Array<Publication> = [];
    // path 编译队列，延后编译 path
    const pathCompileQueue: Array<(transforms?: ReadonlyArray<Transform>) => void> = [];

    for (const [index, child] of input.entries()) {
      if ('namespace' in child)
        throw new RetikzReconcilerError(
          RetikzReconcilerErrorCode.Contract,
          'Composite input requires the Core full preparation boundary',
        );
      const irPath = createCompileChildPath(prefix, index);
      const occurrence = { sourcePath: irPath, expansionPath: [] };
      const compileOptions: WeaveElementCompileContext['options'] = {
        ...context,
        shared: this.context.shared,
        namespace: namespaceRegistry.namespace,
        irPath,
        occurrence,
      };
      const semanticOwner = this.batch.provenanceTracker.createOwner(
        child,
        index,
        owner,
        false,
        namespaceRegistry.identity,
      );
      const element: WeaveElementCompileContext = { container, options: compileOptions, owner: semanticOwner };
      const node = this.batch.updating
        ? this.batch.transaction.readNode(parent).children[index]
        : this.batch.editor.createNode(child, parent, context.style);
      if (!this.batch.updating) this.batch.tracker.registerNodeBinding(node);
      if (!jsonStructuralEquals(this.batch.transaction.readNode(node).input.context, context.style)) {
        this.batch.transaction
          .editNodeAttribute(node, 'pendingInputs')
          .push({ source: 'context', changes: new Set(['style', 'layout']) });
        this.batch.tracker.invalidateNode(node);
      }
      if (node.type === 'path') {
        const pathNode = node;
        if (child.id !== undefined) ids.set(child.id, node);
        pathCompileQueue.push(transforms => {
          outputs.set(pathNode, this.reconcilePath(pathNode, element, transforms));
        });
      } else if (node.type === 'scope' && child.type === 'scope') {
        const scope = this.reconcileScope(node, child, element);
        outputs.set(node, scope.output);
        layouts.push(...scope.layouts);
        publications.push(...scope.publications);
      } else if (node.type === 'node' || node.type === 'coordinate') {
        const compiled =
          node.type === 'node' ? this.reconcileNode(node, element) : this.reconcileCoordinate(node, element);
        outputs.set(node, compiled.output);
        layouts.push(compiled.layout);
        publications.push(compiled.publication);
      }
    }
    return {
      outputs: transforms => {
        pathCompileQueue.forEach(compile => compile(transforms));
        return this.batch.transaction.readNode(parent).children.flatMap(node => {
          const output = outputs.get(node);
          return output === undefined ? [] : [output];
        });
      },
      layouts,
      publications,
    };
  }
}
