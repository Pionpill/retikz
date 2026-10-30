import type {
  CompileCompositeOptions,
  CompiledNodeLayout,
  CompileNamespaceRegistry,
  CompileOccurrenceLocator,
  CompileOptions,
  CompileOutput,
  CompileOwnerKey,
  CompileWarning,
  ElementCompileOptions,
  ElementCompileResult,
  ExecuteOptions,
  IRChild,
  IRScene,
  IRScope,
  SceneCompilationSnapshot,
  Transform,
} from '@retikz/core';
import {
  assembleSceneCompilation,
  assembleScopeOutput,
  compileCoordinate,
  compileNode,
  compilePath,
  compileScope,
  createSharedCompileContext,
  createCompileNamespaceRegistry,
  CompileProvenanceTracker,
  createCompileChildPath,
  prepareScopeCompilation,
  projectCompileReference,
  projectPublishedCompileLayout,
  projectScopeCompileLayouts,
  resolveScopeContext,
} from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import { isPropertyPathEqual } from '@retikz/foundation';
import { jsonStructuralEquals } from '@retikz/foundation';

import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../error';
import { WeaveEditor } from './editor';
import { WeaveTracker } from './tracker';
import { WeaveTransaction } from './transaction';
import type {
  WeaveBatch,
  WeaveCoordinateNode,
  WeaveNode,
  WeavePathNode,
  WeaveRoot,
  WeaveScopeNode,
  WeaveShapeNode,
} from './types';

/** 本次完整基础树准备结果 */
type WeaveCompilation = {
  /** 已完成编译的声明根 */
  root: WeaveRoot;
  /** 可交给 Runtime 提交的完整输出 */
  compilation: SceneCompilationSnapshot<readonly []>;
  /** 本次实际执行元素编译的次数，不含缓存复用与 Scope 上下文准备 */
  visited: number;
};

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
  namespaceRegistry: CompileNamespaceRegistry;
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
  namespaceRegistry: CompileNamespaceRegistry;
  /** 当前命名空间的用户 id 索引，key 为声明 id，value 为对应的稳定节点对象 */
  ids: Map<string, WeaveNode>;
  /** 子元素共享的继承、变换与祖先约束 */
  options: Omit<ElementCompileOptions, 'shared'>;
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
  options: ElementCompileOptions & { occurrence: CompileOccurrenceLocator };
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
  private readonly shared: ReturnType<typeof createSharedCompileContext>;
  /** Scene 最终组装的留白，不参与元素编译 */
  private readonly padding: CompileOptions['padding'];
  /** 本次准备结果的警告列表，收集编译与名称注册警告，在重新编译前重置 */
  private diagnostics: Array<CompileWarning> = [];
  private namespace = createCompileNamespaceRegistry(undefined, warning => this.diagnostics.push(warning));
  private provenance = new CompileProvenanceTracker(this.namespace.identity);
  /** 本树固定的 scopeId 前缀，同时作为根节点的 scopeId */
  private readonly treeId: string;
  /** 本次实际执行元素编译的次数，缓存复用不计入 */
  private visited = 0;
  private readonly root: WeaveRoot;
  private transaction: WeaveTransaction;
  private readonly editor: WeaveEditor;
  private readonly tracker: WeaveTracker;
  /** 是否已进入更新模式；此后遍历复用既有子节点，不再按首次挂载方式创建 */
  private updating = false;
  /** 本批强制重算元素，但保留稳定声明节点与操作校验 */
  private forceFull = false;
  /** key 为稳定节点，value 为批次操作前的声明 irPath；路径变化时禁止复用旧位置的编译缓存 */
  private previousNodeIrPaths = new Map<WeaveNode, PropertyPath>();
  /** 最近一次挂载或 finish 后的完整结果，供空批次复用；准备与 commit 不替换此值 */
  private completed: WeaveCompilation | undefined;

  constructor(
    private source: IRScene,
    options: Omit<CompileOptions, keyof CompileCompositeOptions> = {},
    private readonly execution: ExecuteOptions = {},
  ) {
    this.shared = createSharedCompileContext(options);
    this.padding = options.padding;
    this.treeId = `weave-${nextTreeId++}`;
    const { children, ...own } = source;
    void children;
    this.root = {
      type: 'root',
      scopeId: this.treeId,
      current: null,
      pending: {
        parent: null,
        input: own,
        children: [],
        shared: this.shared,
        ids: new Map(),
        scopeIds: new Map(),
        records: new Map(),
      },
    };
    this.transaction = new WeaveTransaction(this.root);
    this.transaction.editNodeAttribute(this.root, 'scopeIds').set(this.root.scopeId, this.root);
    this.editor = new WeaveEditor(this.root, this.transaction);
    this.tracker = new WeaveTracker(this.root, this.transaction);
  }

  /** 首次编译基础树并组装可提交产物 */
  mount(): WeaveCompilation {
    if (this.completed !== undefined)
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave is already mounted');
    try {
      const result = this.reconcileChildren();
      const compilation = assembleSceneCompilation(
        this.source,
        result.outputs(),
        this.shared,
        {
          diagnostics: this.diagnostics,
          provenanceTracker: this.provenance,
        },
        this.padding,
      );
      // 新树尚未对外发布；Runtime 再原子发布整棵树及输出
      this.transaction.commit();
      this.transaction.finish();
      this.completed = { root: this.root, visited: this.visited, compilation };
      return this.completed;
    } catch (error) {
      this.transaction.rollback();
      throw error;
    }
  }

  /** 在既有树上准备一批更新；返回值与当前树在提交前互相隔离 */
  update(batch: WeaveBatch, forceFull = false): WeavePreparedUpdate {
    const completed = this.completed;
    if (completed === undefined)
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Mount Weave before updating');
    this.transaction = new WeaveTransaction(this.root);
    const transaction = this.transaction;
    const previousSource = this.source;

    try {
      this.updating = true;
      this.forceFull = forceFull;
      this.editor.useTransaction(transaction);
      this.tracker.beginBatch(transaction);
      this.previousNodeIrPaths = this.editor.captureNodeIrPaths();

      let modified = false;
      for (const operation of batch.operations) {
        const changes = this.editor.applyOperation(operation, resolveScopeContext(this.source, this.shared));
        if (changes === undefined) continue;
        for (const node of changes.insertedNodes) this.tracker.registerNodeBinding(node);
        for (const node of changes.changedNodes) this.tracker.invalidateNode(node);
        // 子节点先解绑，避免清理子节点时重新编辑已丢弃的父 Scope
        for (let index = changes.removedNodes.length - 1; index >= 0; index--) {
          const node = changes.removedNodes[index];
          this.tracker.detachNodeDependencies(node);
          transaction.discardNode(node);
        }
        modified = true;
      }

      // 按需重新编译
      let prepared = { ...completed, visited: 0 };
      if (modified) {
        this.source = {
          ...this.transaction.readNode(this.root).input,
          children: this.transaction
            .readNode(this.root)
            .children.map(node => this.editor.serializeNodeDeclaration(node)),
        };
        this.diagnostics = [];
        this.namespace = createCompileNamespaceRegistry(undefined, warning => this.diagnostics.push(warning));
        this.provenance = new CompileProvenanceTracker(this.namespace.identity);
        this.visited = 0;
        // 输出遍历重放名称声明，避免把最终名称表当成声明位置的引用环境
        this.transaction.editNode(this.root).ids = new Map();
        const result = this.reconcileChildren();
        const compilation = assembleSceneCompilation(
          this.source,
          result.outputs(),
          this.shared,
          {
            diagnostics: this.diagnostics,
            provenanceTracker: this.provenance,
          },
          this.padding,
        );
        prepared = { root: this.root, visited: this.visited, compilation };
      }
      let closed = false;
      return {
        ...prepared,
        commit: () => transaction.commit(),
        finish: () => {
          transaction.finish();
          this.completed = prepared;
          closed = true;
          this.tracker.pruneRemovedBindings();
        },
        rollback: () => {
          if (closed) return;
          transaction.rollback();
          this.source = previousSource;
          closed = true;
          this.tracker.pruneUncommittedBindings();
        },
      };
    } catch (error) {
      transaction.rollback();
      this.source = previousSource;
      this.tracker.pruneUncommittedBindings();
      throw error;
    }
  }

  /** 校验当前位置的缓存输入及实际名称绑定，不用旧索引推断新引用 */
  private canNodeReuse(node: WeaveNode, compileOptions: ElementCompileOptions): boolean {
    if (this.forceFull || !this.updating || node.current === null || this.tracker.isNodeDirty(node)) return false;
    if (
      !isPropertyPathEqual(this.previousNodeIrPaths.get(node) ?? [], compileOptions.irPath) ||
      !jsonStructuralEquals(node.current.input.context, compileOptions.context)
    )
      return false;
    const records = this.transaction.readNode(this.root).records.get(node);
    if (records === undefined || records.diagnostics.length > 0) return false;
    const names = new Map(records.reads.map(read => [read.name, read.binding]));
    for (const [name, binding] of names) {
      let actual: object | undefined;
      for (let namespace = compileOptions.namespace; namespace !== undefined; namespace = namespace.parent) {
        const entry = namespace.bindings.get(name);
        if (entry === undefined) continue;
        if (entry.state !== 'ready') return false;
        actual = entry.binding;
        break;
      }
      if (actual !== binding) return false;
    }
    return true;
  }

  /** 复用只读产物，重新归属读取事实及双向关系 */
  private reuseCompiledNode<T>(node: WeaveNode, compiled: T, compileOptions: ElementCompileOptions): T {
    return this.recordCompilation(node, {
      status: 'compiled',
      compiled,
      reads: this.tracker.refreshCompileReads(
        this.transaction.readNode(this.root).records.get(node)?.reads ?? [],
        compileOptions,
      ),
      diagnostics: [],
    });
  }

  /** 保存本元素读取与诊断，建立本版本双向计算关联 */
  private recordCompilation<T>(node: WeaveNode, result: ElementCompileResult<T>, append = false): T {
    this.tracker.recordNodeReads(node, result.reads, result.status === 'compiled' ? result.diagnostics : [], append);
    // 兜底报错，逻辑上不会走到这里
    if (result.status === 'pending') {
      throw new RetikzReconcilerError(
        RetikzReconcilerErrorCode.Compile,
        'Weave compilation has unresolved dependencies',
        { details: { names: result.reads.map(read => read.name) } },
      );
    }
    this.diagnostics.push(...result.diagnostics);
    return result.compiled;
  }

  /** 只从已完成的局部编译状态投影引用几何 */
  private projectNodeReference(node: WeaveNode, transforms: ReadonlyArray<Transform>): CompiledNodeLayout {
    switch (node.type) {
      case 'node': {
        const compiled = this.transaction.readNode(node).compiled;
        if (compiled !== null) return projectCompileReference({ type: 'node', compiled }, this.shared, transforms);
        break;
      }
      case 'coordinate': {
        const compiled = this.transaction.readNode(node).compiled;
        if (compiled !== null)
          return projectCompileReference({ type: 'coordinate', compiled }, this.shared, transforms);
        break;
      }
      case 'scope': {
        const compiled = this.transaction.readNode(node).compiled;
        if (compiled !== null) return projectCompileReference({ type: 'scope', compiled }, this.shared, transforms);
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
    const warningCount = this.diagnostics.length;
    namespaceRegistry.register(
      name,
      this.transaction.readNode(node).compiled === null
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
    const entry = this.transaction.readNode(this.root).records.get(node);
    if (entry !== undefined && this.diagnostics.length > warningCount) {
      this.transaction.editNodeAttribute(this.root, 'records').set(node, {
        ...entry,
        diagnostics: [...entry.diagnostics, ...this.diagnostics.slice(warningCount)],
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
    const contribution = { ...output, primitives: this.provenance.materializePrimitives(output.primitives) };
    this.provenance.recordPrimitives(contribution.primitives, owner, role);
    return contribution;
  }

  /** 编译 Node，登记读取与引用并准备局部输出 */
  private reconcileNode(
    node: WeaveShapeNode,
    element: WeaveElementCompileContext,
  ): { output: CompileOutput | undefined; layout: CompiledNodeLayout; publication: Publication } {
    const state = this.transaction.editNode(node);
    const { options, container, owner } = element;
    if (!this.canNodeReuse(node, options) || state.compiled === null) {
      this.tracker.invalidateNode(node);
      this.visited++;
      state.compiled = this.recordCompilation(node, compileNode(state.input.own, options));
    } else state.compiled = this.reuseCompiledNode(node, state.compiled, options);
    state.input = { ...state.input, context: options.context };
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
    const state = this.transaction.editNode(node);
    const { options, container } = element;
    if (!this.canNodeReuse(node, options) || state.compiled === null) {
      this.tracker.invalidateNode(node);
      this.visited++;
      state.compiled = this.recordCompilation(node, compileCoordinate(state.input.own, options));
    } else state.compiled = this.reuseCompiledNode(node, state.compiled, options);
    state.input = { ...state.input, context: options.context };
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
    const state = this.transaction.editNode(node);
    const compileOptions = element.options;
    if (!this.canNodeReuse(node, compileOptions) || state.compiled === null) {
      this.visited++;
      state.compiled = this.recordCompilation(
        node,
        compilePath(state.input.own, {
          ...compileOptions,
          transforms: transforms ?? compileOptions.transforms,
        }),
      );
    } else state.compiled = this.reuseCompiledNode(node, state.compiled, compileOptions);
    state.input = { ...state.input, context: compileOptions.context };
    state.pendingInputs = [];
    return this.collectOutput(state.compiled.output, 'path', element.owner);
  }

  /** 依次完成 Scope 准备、子树、包络、引用投影与输出包装 */
  private reconcileScope(
    node: WeaveScopeNode,
    child: IRScope,
    element: WeaveElementCompileContext,
  ): { output: CompileOutput; layouts: Array<CompiledNodeLayout>; publications: Array<Publication> } {
    const state = this.transaction.editNode(node);
    const { namespaceRegistry, ids, options: context } = element.container;
    const { options: compileOptions, owner: semanticOwner } = element;
    const occurrence = compileOptions.occurrence;
    const irPath = compileOptions.irPath;
    const reusable = this.canNodeReuse(node, compileOptions);
    const previousCompiled = state.compiled;
    const previousReads = this.transaction.readNode(this.root).records.get(node)?.reads ?? [];
    if (!reusable) this.tracker.invalidateNode(node);
    state.compiled = null;
    state.input = { ...state.input, context: compileOptions.context };
    state.pendingInputs = [];
    if (child.localNamespace) state.ids = new Map();
    else delete state.ids;
    // 进入准备阶段
    const prepared = this.recordCompilation(node, prepareScopeCompilation(state.input.own, compileOptions));
    if (child.id !== undefined) this.registerReference(node, child.id, [...irPath, 'id'], element);
    const nestedNamespaceRegistry = child.localNamespace
      ? createCompileNamespaceRegistry(namespaceRegistry.namespace, warning => this.diagnostics.push(warning))
      : namespaceRegistry;
    const preliminary = prepared.preliminaryTransforms ?? [];
    const nested = this.reconcileChildren(child.children, {
      parent: node,
      namespaceRegistry: nestedNamespaceRegistry,
      ids: state.ids === undefined ? ids : this.transaction.editNodeAttribute(node, 'ids'),
      options: {
        ...context,
        irPath,
        occurrence,
        context: prepared.scope,
        transforms: [...(context.transforms ?? []), ...preliminary],
        ancestorScopes: new Set([...(context.ancestorScopes ?? []), node]),
      },
      owner: semanticOwner,
      prefix: irPath,
    });
    if (reusable && previousCompiled !== null && !this.tracker.isNodeDirty(node))
      state.compiled = this.recordCompilation(node, {
        status: 'compiled',
        compiled: previousCompiled,
        reads: this.tracker.refreshCompileReads(previousReads, compileOptions),
        diagnostics: [],
      });
    else {
      this.visited++;
      state.compiled = this.recordCompilation(
        node,
        compileScope(state.input.own, prepared, nested.layouts, compileOptions),
        true,
      );
    }
    this.tracker.recordScopeLayoutDependencies(node);
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
        irPath: this.transaction.readNode(publication.node).compiled?.irPath,
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
      this.shared,
      this.provenance,
      semanticOwner,
    );
    publications.push({ namespaceRegistry, node, layout: this.projectNodeReference(node, context.transforms ?? []) });
    return { output, layouts, publications };
  }

  /** 保持 Core 的声明可见性顺序，Path 在所属容器收尾后计算 */
  private reconcileChildren(
    input: ReadonlyArray<IRChild> = this.source.children,
    container: WeaveContainerCompileContext = {
      parent: this.root,
      namespaceRegistry: this.namespace,
      ids: this.transaction.editNodeAttribute(this.root, 'ids'),
      options: { context: resolveScopeContext(this.source, this.shared), irPath: [] },
      owner: this.provenance.root,
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
        shared: this.shared,
        namespace: namespaceRegistry.namespace,
        irPath,
        occurrence,
      };
      const semanticOwner = this.provenance.createOwner(child, index, owner, false, namespaceRegistry.identity);
      const element: WeaveElementCompileContext = { container, options: compileOptions, owner: semanticOwner };
      const node = this.updating
        ? this.transaction.readNode(parent).children[index]
        : this.editor.createNode(child, parent, context.context);
      if (!this.updating) this.tracker.registerNodeBinding(node);
      if (!jsonStructuralEquals(this.transaction.readNode(node).input.context, context.context)) {
        this.transaction
          .editNodeAttribute(node, 'pendingInputs')
          .push({ source: 'context', changes: new Set(['style', 'layout']) });
        this.tracker.invalidateNode(node);
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
        return this.transaction.readNode(parent).children.flatMap(node => {
          const output = outputs.get(node);
          return output === undefined ? [] : [output];
        });
      },
      layouts,
      publications,
    };
  }
}
