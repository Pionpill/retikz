import {
  assembleSceneCompilation,
  assembleScopeOutput,
  compileCoordinate,
  compileNode,
  compilePath,
  compileScope,
  createCompileEnvironment,
  createCompileNamespaceRegistry,
  createCompileObservationRuntime,
  createCompileProvenanceTracker,
  formatCompileChildPath,
  prepareScopeCompilation,
  projectCompileReference,
  projectPublishedCompileLayout,
  projectScopeCompileLayouts,
  resolveScopeContext,
  jsonStructuralEquals,
} from '@retikz/core';
import type {
  CompileNamespaceRegistry,
  CompileWarning,
  CompileRead,
  CompileOutput,
  CompileOptions,
  CompileOwnerKey,
  ElementCompileOptions,
  ElementCompileResult,
  IRChild,
  IRScene,
  IRScope,
  IRComposite,
  CompileOccurrenceLocator,
  NodeLayout,
  SceneCompilationPreparationOptions,
  Transform,
  CompileCompositeOptions,
  PreparedSceneCompilation,
} from '@retikz/core';

import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../error';
import { readWeaveCurrent, WeaveStateTransaction } from './state';
import type {
  WeaveDependencyKind,
  WeaveNode,
  WeaveRoot,
  WeaveScopeNode,
  WeavePathNode,
  WeaveShapeNode,
  WeaveCoordinateNode,
  WeaveBatch,
  WeaveTarget,
  WeaveElementInput,
  WeaveOwnInput,
} from './types';

/** 本次完整基础树准备结果 */
export type WeaveCompilation = {
  /** 已完成编译的声明根 */
  root: WeaveRoot;
  /** 可交给 Runtime 提交的完整输出 */
  compilation: PreparedSceneCompilation<readonly []>;
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
  layout: NodeLayout;
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
  options: Omit<ElementCompileOptions, 'environment' | 'observation'>;
  /** 容器的来源归属 */
  owner: CompileOwnerKey;
  /** 子声明路径前缀 */
  prefix: string;
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
  private readonly environment: ReturnType<typeof createCompileEnvironment>;
  private observation: ReturnType<typeof createCompileObservationRuntime> | undefined;
  private provenance = createCompileProvenanceTracker();
  /** 本次准备结果的警告列表，收集编译与名称注册警告，在重新编译前重置 */
  private diagnostics: Array<CompileWarning> = [];
  private namespace = createCompileNamespaceRegistry(undefined, warning => this.diagnostics.push(warning));
  /** 本树固定的 scopeId 前缀，同时作为根节点的 scopeId */
  private readonly treeId: string;
  /** 本树内 Scope 的递增编号，已分配的编号不因删除或回滚而复用 */
  private nextScopeId = 0;
  /** 本次实际执行元素编译的次数，缓存复用不计入 */
  private visited = 0;
  private readonly root: WeaveRoot;
  private state: WeaveStateTransaction;
  /** Core 读取记录的 binding 对象到稳定节点的映射，用于将读取关系转换为节点依赖 */
  private readonly bindings = new Map<object, WeaveNode>();
  /** 是否已进入更新模式；此后遍历复用既有子节点，不再按首次挂载方式创建 */
  private updating = false;
  /** 本批次已失效的节点集合，用于传播去重与禁止缓存复用，编译完成后不会逐项移除 */
  private readonly dirtyNodes = new Set<WeaveNode>();
  /** key 为稳定节点，value 为批次操作前的声明 irPath；路径变化时禁止复用旧位置的编译缓存 */
  private readonly previousNodeIrPaths = new Map<WeaveNode, string>();
  /** 最近一次挂载或 finish 后的完整结果，供空批次复用；准备与 commit 不替换此值 */
  private completed: WeaveCompilation | undefined;

  constructor(
    private source: IRScene,
    options: Omit<CompileOptions, keyof CompileCompositeOptions> = {},
    private readonly execution: SceneCompilationPreparationOptions = {},
  ) {
    this.environment = createCompileEnvironment(options);
    this.observation =
      execution.observers === undefined ? undefined : createCompileObservationRuntime(execution.observers);
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
        environment: this.environment,
        ids: new Map(),
        scopeIds: new Map(),
        records: new Map(),
      },
    };
    this.state = new WeaveStateTransaction(this.root);
    this.state.editNodeAttribute(this.root, 'scopeIds').set(this.root.scopeId, this.root);
  }

  /** 标记计算关联闭包；Scope 的最终变换也可能改变后代引用投影 */
  private invalidate(node: WeaveNode): void {
    if (this.dirtyNodes.has(node)) return;
    this.dirtyNodes.add(node);
    const state = this.state.readNode(node);
    for (const consumer of state.consumers) {
      if (!this.dirtyNodes.has(consumer))
        this.state
          .editNodeAttribute(consumer, 'pendingInputs')
          .push({ source: 'dependency', producer: node, changes: new Set(['style', 'layout']) });
      this.invalidate(consumer);
    }
    if (node.type === 'scope') {
      for (const child of this.state.readNode(node).children) {
        if (!this.dirtyNodes.has(child))
          this.state
            .editNodeAttribute(child, 'pendingInputs')
            .push({ source: 'dependency', producer: node, changes: new Set(['style', 'layout']) });
        this.invalidate(child);
      }
    }
  }

  /** 校验当前位置的缓存输入及实际名称绑定，不用旧索引推断新引用 */
  private canNodeReuse(node: WeaveNode, call: ElementCompileOptions): boolean {
    if (!this.updating || node.current === null || this.dirtyNodes.has(node) || this.observation !== undefined)
      return false;
    if (
      this.previousNodeIrPaths.get(node) !== call.irPath ||
      !jsonStructuralEquals(node.current.input.context, call.context)
    )
      return false;
    const records = this.state.readNode(this.root).records.get(node);
    if (records === undefined || records.diagnostics.length > 0) return false;
    const names = new Map(records.reads.map(read => [read.name, read.binding]));
    for (const [name, binding] of names) {
      let actual: object | undefined;
      for (let namespace = call.namespace; namespace !== undefined; namespace = namespace.parent) {
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

  /** 把复用产物的读取记录关联到本批名称 frame，避免保留旧工作区 */
  private refreshReads(reads: ReadonlyArray<CompileRead>, call: ElementCompileOptions): Array<CompileRead> {
    const refreshed: Array<CompileRead> = [];
    for (const name of new Set(reads.map(read => read.name))) {
      for (let namespace = call.namespace; namespace !== undefined; namespace = namespace.parent) {
        const binding = namespace.bindings.get(name);
        refreshed.push({
          namespace,
          name,
          state: binding?.state ?? 'missing',
          ...(binding === undefined ? {} : { binding: binding.binding }),
        });
        if (binding !== undefined) break;
      }
    }
    return refreshed;
  }

  /** 复用只读产物，重新归属读取事实及双向关系 */
  private reuse<T>(node: WeaveNode, compiled: T, call: ElementCompileOptions): T {
    return this.record(node, {
      status: 'compiled',
      compiled,
      reads: this.refreshReads(this.state.readNode(this.root).records.get(node)?.reads ?? [], call),
      diagnostics: [],
    });
  }

  /** 序列化候选声明供 Core 组装和来源遍历，不比较新旧完整 IR */
  private declaration(node: WeaveNode): WeaveElementInput {
    if (node.type === 'scope') {
      const state = this.state.readNode(node);
      return { ...state.input.own, children: state.children.map(child => this.declaration(child)) };
    }
    return this.state.readNode(node).input.own;
  }

  /** 重建操作寻址索引；编译引用仍由 Core 按声明顺序建立 */
  private indexChildren(container: WeaveRoot | WeaveScopeNode, inherited?: Map<string, WeaveNode>): void {
    const ids =
      container.type === 'root' || this.state.readNode(container).input.own.localNamespace
        ? new Map<string, WeaveNode>()
        : inherited;
    if (ids === undefined)
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Missing namespace owner');
    if (container.type === 'root') this.state.editNode(container).ids = ids;
    else {
      const state = this.state.editNode(container);
      if (state.input.own.localNamespace) state.ids = ids;
      else delete state.ids;
    }
    for (const child of this.state.readNode(container).children) {
      const own = this.state.readNode(child).input.own;
      if (own.id !== undefined) ids.set(own.id, child);
      if (child.type === 'node') {
        for (const id of this.state.readNode(child).input.own.aliasIds ?? []) ids.set(id, child);
      }
      if (child.type === 'scope') this.indexChildren(child, ids);
    }
  }

  /** 解析批次容器，地址仅在当前候选结构内有效 */
  private findScope(scopeId: string): WeaveRoot | WeaveScopeNode {
    const scopeNode = this.state.readNode(this.root).scopeIds.get(scopeId);
    if (scopeNode === undefined)
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Unknown Weave scope', {
        details: { scopeId },
      });
    return scopeNode;
  }

  /** 解析元素地址，不允许把 Root 当成基础元素 */
  private findTarget(target: WeaveTarget): WeaveNode {
    let container = this.findScope(target.scopeId);
    if (target.kind === 'scope') {
      if (container.type !== 'root') return container;
    } else if (target.kind === 'child') {
      const child =
        Number.isInteger(target.index) && target.index >= 0
          ? this.state.readNode(container).children[target.index]
          : undefined;
      if (child !== undefined) return child;
    } else {
      for (;;) {
        const state = this.state.readNode(container);
        const found = state.ids?.get(target.id);
        if (found !== undefined) return found;
        if (container.type === 'root') break;
        container = this.state.readNode(container).parent;
      }
    }
    throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Unknown Weave target', {
      details: { target },
    });
  }

  /** 按判别类型替换权威输入，不保留被省略的旧覆盖 */
  private replaceInput(node: WeaveNode, input: WeaveOwnInput): void {
    if (node.type === 'node' && input.type === 'node')
      this.state.editNode(node).input = { ...this.state.readNode(node).input, own: input };
    else if (node.type === 'coordinate' && input.type === 'coordinate')
      this.state.editNode(node).input = { ...this.state.readNode(node).input, own: input };
    else if (node.type === 'scope' && input.type === 'scope')
      this.state.editNode(node).input = { ...this.state.readNode(node).input, own: input };
    else if (node.type === 'path' && input.type === 'path')
      this.state.editNode(node).input = { ...this.state.readNode(node).input, own: input };
    else throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave input type does not match target');
    this.state.editNodeAttribute(node, 'pendingInputs').push({ source: 'own', changes: new Set(['style', 'layout']) });
    this.invalidate(node);
  }

  /** 新增声明子树，成员在候选结构中即时可寻址 */
  private insertElement(input: WeaveElementInput, parent: WeaveRoot | WeaveScopeNode): WeaveNode {
    const node = this.createNode(input, parent, resolveScopeContext(this.source, this.environment));
    if (node.type === 'scope' && input.type === 'scope') {
      for (const child of input.children) this.insertElement(child, node);
    }
    this.invalidate(node);
    return node;
  }

  /** 删除候选子树的双向关联、记录和容器地址 */
  private removeElement(node: WeaveNode): void {
    this.invalidate(node);
    if (node.type === 'scope') {
      for (const child of this.state.readNode(node).children) this.removeElement(child);
      this.state.editNodeAttribute(this.root, 'scopeIds').delete(node.scopeId);
    }
    const state = this.state.readNode(node);
    for (const producer of state.dependencies.keys()) this.state.editNodeAttribute(producer, 'consumers').delete(node);
    for (const consumer of state.consumers) this.state.editNodeAttribute(consumer, 'dependencies').delete(node);
    this.state.editNodeAttribute(this.root, 'records').delete(node);
    this.state.discardNode(node);
  }

  /** 在既有树上准备一批更新；返回值与当前树在提交前互相隔离 */
  update(batch: WeaveBatch): WeavePreparedUpdate {
    const completed = this.completed;
    if (completed === undefined)
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Mount Weave before updating');
    this.state = new WeaveStateTransaction(this.root);
    const transaction = this.state;
    const previousSource = this.source;

    try {
      this.updating = true;
      this.dirtyNodes.clear();
      this.previousNodeIrPaths.clear();
      const rememberPaths = (container: WeaveRoot | WeaveScopeNode, prefix: string): void => {
        for (const [index, child] of readWeaveCurrent(container).children.entries()) {
          const path = formatCompileChildPath(prefix, index, child.type);
          this.previousNodeIrPaths.set(child, path);
          if (child.type === 'scope') rememberPaths(child, `${path}.`);
        }
      };
      rememberPaths(this.root, '');

      // WeaveTree 更新
      let modified = false;
      for (const operation of batch.operations) {
        if (operation.kind === 'insert') {
          const parent = this.findScope(operation.parentId);
          const length = this.state.readNode(parent).children.length;
          if (!Number.isInteger(operation.index) || operation.index < 0 || operation.index > length)
            throw new RetikzReconcilerError(
              RetikzReconcilerErrorCode.Contract,
              'Weave insertion index is out of bounds',
            );
          if (operation.elements.length === 0) continue;
          const inserted = operation.elements.map(input => this.insertElement(input, parent));
          const children = this.state.editNodeAttribute(parent, 'children');
          children.splice(length, inserted.length);
          children.splice(operation.index, 0, ...inserted);
          if (parent.type === 'scope') this.invalidate(parent);
        } else {
          const node = this.findTarget(operation.target);
          if (operation.kind === 'update') this.replaceInput(node, operation.input);
          else {
            const parent = this.state.readNode(node).parent;
            const children = this.state.editNodeAttribute(parent, 'children');
            children.splice(children.indexOf(node), 1);
            this.removeElement(node);
            if (parent.type === 'scope') this.invalidate(parent);
          }
        }
        modified = true;
        this.indexChildren(this.root);
      }

      // 按需重新编译
      let prepared = { ...completed, visited: 0 };
      if (modified) {
        this.source = {
          ...this.state.readNode(this.root).input,
          children: this.state.readNode(this.root).children.map(node => this.declaration(node)),
        };
        this.provenance = createCompileProvenanceTracker();
        this.diagnostics = [];
        this.namespace = createCompileNamespaceRegistry(undefined, warning => this.diagnostics.push(warning));
        this.observation =
          this.execution.observers === undefined
            ? undefined
            : createCompileObservationRuntime(this.execution.observers);
        this.visited = 0;
        // 输出遍历重放名称声明，避免把最终名称表当成声明位置的引用环境
        this.state.editNode(this.root).ids = new Map();
        const result = this.reconcileChildren();
        const compilation = assembleSceneCompilation(this.source, result.outputs(), this.environment, {
          observation: this.observation,
          diagnostics: this.diagnostics,
          provenanceTracker: this.provenance,
        });
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
          const retained = new Set<WeaveNode>();
          const collect = (container: WeaveRoot | WeaveScopeNode): void => {
            for (const node of readWeaveCurrent(container).children) {
              retained.add(node);
              if (node.type === 'scope') collect(node);
            }
          };
          collect(this.root);
          for (const node of this.bindings.values()) if (!retained.has(node)) this.bindings.delete(node);
        },
        rollback: () => {
          if (closed) return;
          transaction.rollback();
          this.source = previousSource;
          closed = true;
          for (const node of this.bindings.values()) if (node.current === null) this.bindings.delete(node);
        },
      };
    } catch (error) {
      transaction.rollback();
      this.source = previousSource;
      for (const node of this.bindings.values()) if (node.current === null) this.bindings.delete(node);
      throw error;
    }
  }

  /** 保存本元素读取与诊断，建立本版本双向计算关联 */
  private record<T>(node: WeaveNode, result: ElementCompileResult<T>, append = false): T {
    // 登记读取记录与诊断
    const previous = append ? this.state.readNode(this.root).records.get(node) : undefined;
    const reads = [...(previous?.reads ?? []), ...result.reads];
    this.state.editNodeAttribute(this.root, 'records').set(node, {
      reads,
      diagnostics: [...(previous?.diagnostics ?? []), ...(result.status === 'compiled' ? result.diagnostics : [])],
    });

    // 重新构建拓扑关系
    for (const producer of this.state.readNode(node).dependencies.keys())
      this.state.editNodeAttribute(producer, 'consumers').delete(node);
    this.state.editNodeAttribute(node, 'dependencies').clear();
    for (const read of reads) {
      const producer = read.binding === undefined ? undefined : this.bindings.get(read.binding);
      if (producer === undefined) continue;
      this.state.editNodeAttribute(node, 'dependencies').set(producer, [null]);
      this.state.editNodeAttribute(producer, 'consumers').add(node);
    }
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
  private reference(node: WeaveNode, transforms: ReadonlyArray<Transform>): NodeLayout {
    switch (node.type) {
      case 'node': {
        const compiled = this.state.readNode(node).compiled;
        if (compiled !== null) return projectCompileReference({ type: 'node', compiled }, this.environment, transforms);
        break;
      }
      case 'coordinate': {
        const compiled = this.state.readNode(node).compiled;
        if (compiled !== null)
          return projectCompileReference({ type: 'coordinate', compiled }, this.environment, transforms);
        break;
      }
      case 'scope': {
        const compiled = this.state.readNode(node).compiled;
        if (compiled !== null)
          return projectCompileReference({ type: 'scope', compiled }, this.environment, transforms);
        break;
      }
    }
    throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Compile, 'Cannot publish an unfinished reference');
  }

  /** 创建声明节点并登记本次编译的节点与容器索引 */
  private createNode(
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
          scopeId: `${this.treeId}/scope-${this.nextScopeId++}`,
          current: null,
          pending: {
            ...base,
            input: { own: scopeInput, context },
            compiled: null,
            children: [],
            ...(childElement.localNamespace ? { ids: new Map<string, WeaveNode>() } : {}),
          },
        };
        this.state.editNodeAttribute(this.root, 'scopeIds').set(node.scopeId, node);
        break;
      }
      default:
        node = {
          type: 'path',
          current: null,
          pending: { ...base, input: { own: childElement, context }, compiled: null },
        };
    }
    this.state.editNode(node);
    this.state.editNodeAttribute(parentWeaveNode, 'children').push(node);
    this.bindings.set(node, node);
    return node;
  }

  /** 登记引用名称及用户索引，并归集重名诊断 */
  private registerReference(node: WeaveNode, name: string, path: string, element: WeaveElementCompileContext): void {
    const { namespaceRegistry, ids } = element.container;
    const call = element.options;
    const warningCount = this.diagnostics.length;
    namespaceRegistry.register(
      name,
      this.state.readNode(node).compiled === null
        ? { state: 'pending', binding: node }
        : {
            state: 'ready',
            binding: node,
            layout: this.reference(node, call.transforms ?? []),
          },
      path,
      call.occurrence,
    );
    ids.set(name, node);
    const entry = this.state.readNode(this.root).records.get(node);
    if (entry !== undefined && this.diagnostics.length > warningCount) {
      this.state.editNodeAttribute(this.root, 'records').set(node, {
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
  ): { output: CompileOutput | undefined; layout: NodeLayout; publication: Publication } {
    const state = this.state.editNode(node);
    const { options, container, owner } = element;
    if (!this.canNodeReuse(node, options) || state.compiled === null) {
      this.invalidate(node);
      this.visited++;
      state.compiled = this.record(node, compileNode(state.input.own, options));
    } else state.compiled = this.reuse(node, state.compiled, options);
    state.input = { ...state.input, context: options.context };
    state.pendingInputs = [];
    if (state.input.own.id) {
      this.registerReference(node, state.input.own.id, `${options.irPath}.id`, element);
      state.input.own.aliasIds?.forEach((id, index) =>
        this.registerReference(node, id, `${options.irPath}.aliasIds[${index}]`, element),
      );
    }
    return {
      output: this.collectOutput(state.compiled.output, 'node', owner),
      layout: state.compiled.layout,
      publication: {
        namespaceRegistry: container.namespaceRegistry,
        node,
        layout: this.reference(node, options.transforms ?? []),
      },
    };
  }

  /** 编译 Coordinate，登记读取与引用并准备局部输出 */
  private reconcileCoordinate(
    node: WeaveCoordinateNode,
    element: WeaveElementCompileContext,
  ): { output: CompileOutput | undefined; layout: NodeLayout; publication: Publication } {
    const state = this.state.editNode(node);
    const { options, container, owner } = element;
    if (!this.canNodeReuse(node, options) || state.compiled === null) {
      this.invalidate(node);
      this.visited++;
      state.compiled = this.record(node, compileCoordinate(state.input.own, options));
    } else state.compiled = this.reuse(node, state.compiled, options);
    state.input = { ...state.input, context: options.context };
    state.pendingInputs = [];
    this.registerReference(node, state.compiled.id, `${options.irPath}.id`, element);
    return {
      output: this.collectOutput(state.compiled.output, 'coordinate', owner),
      layout: this.reference(node, []),
      publication: {
        namespaceRegistry: container.namespaceRegistry,
        node,
        layout: this.reference(node, options.transforms ?? []),
      },
    };
  }

  /** 在容器引用几何就绪后编译 Path 并收集其输出 */
  private reconcilePath(
    node: WeavePathNode,
    element: WeaveElementCompileContext,
    transforms?: ReadonlyArray<Transform>,
  ): CompileOutput | undefined {
    const state = this.state.editNode(node);
    const call = element.options;
    if (!this.canNodeReuse(node, call) || state.compiled === null) {
      this.visited++;
      state.compiled = this.record(
        node,
        compilePath(state.input.own, {
          ...call,
          transforms: transforms ?? call.transforms,
        }),
      );
    } else state.compiled = this.reuse(node, state.compiled, call);
    state.input = { ...state.input, context: call.context };
    state.pendingInputs = [];
    return this.collectOutput(state.compiled.output, 'path', element.owner);
  }

  /** 依次完成 Scope 准备、子树、包络、引用投影与输出包装 */
  private reconcileScope(
    node: WeaveScopeNode,
    child: IRScope,
    element: WeaveElementCompileContext,
  ): { output: CompileOutput; layouts: Array<NodeLayout>; publications: Array<Publication> } {
    const state = this.state.editNode(node);
    const { namespaceRegistry, ids, options: context } = element.container;
    const { options: call, owner: semanticOwner } = element;
    const occurrence = call.occurrence;
    const irPath = call.irPath;
    const reusable = this.canNodeReuse(node, call);
    const previousCompiled = state.compiled;
    const previousReads = this.state.readNode(this.root).records.get(node)?.reads ?? [];
    if (!reusable) this.invalidate(node);
    state.compiled = null;
    state.input = { ...state.input, context: call.context };
    state.pendingInputs = [];
    if (child.localNamespace) state.ids = new Map();
    else delete state.ids;
    // 进入准备阶段
    const prepared = this.record(node, prepareScopeCompilation(state.input.own, call));
    if (child.id !== undefined) this.registerReference(node, child.id, `${irPath}.id`, element);
    const nestedNamespaceRegistry = child.localNamespace
      ? createCompileNamespaceRegistry(namespaceRegistry.namespace, warning => this.diagnostics.push(warning))
      : namespaceRegistry;
    if (child.localNamespace) this.provenance.pushNamespaceFrame();
    const preliminary = prepared.preliminaryTransforms ?? [];
    const nested = this.reconcileChildren(child.children, {
      parent: node,
      namespaceRegistry: nestedNamespaceRegistry,
      ids: state.ids === undefined ? ids : this.state.editNodeAttribute(node, 'ids'),
      options: {
        ...context,
        irPath,
        occurrence,
        context: prepared.scope,
        transforms: [...(context.transforms ?? []), ...preliminary],
        ancestorScopes: new Set([...(context.ancestorScopes ?? []), node]),
        ancestors: [...(context.ancestors ?? []), { owner: { kind: 'scope' }, occurrence }],
      },
      owner: semanticOwner,
      prefix: `${irPath}.`,
    });
    if (reusable && previousCompiled !== null && !this.dirtyNodes.has(node))
      state.compiled = this.record(node, {
        status: 'compiled',
        compiled: previousCompiled,
        reads: this.refreshReads(previousReads, call),
        diagnostics: [],
      });
    else {
      this.visited++;
      state.compiled = this.record(node, compileScope(state.input.own, prepared, nested.layouts, call), true);
    }
    for (const dependency of state.children) {
      if (dependency.type === 'path') continue;
      this.state.editNodeAttribute(node, 'dependencies').set(dependency, [null]);
      this.state.editNodeAttribute(dependency, 'consumers').add(node);
    }
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
        layout: publication.layout,
      });
    }
    const publications = [...nested.publications];
    if (child.id !== undefined)
      namespaceRegistry.replace(node, {
        state: 'ready',
        binding: node,
        layout: this.reference(node, context.transforms ?? []),
      });
    if (child.localNamespace) this.provenance.popNamespaceFrame();
    const layouts = projectScopeCompileLayouts(child, state.compiled.envelope, nested.layouts, transforms);
    this.provenance.recordPrimitives(state.compiled.output.primitives, semanticOwner, 'scope-frame');
    const output = assembleScopeOutput(
      state.compiled,
      nested.outputs([...(context.transforms ?? []), ...transforms]),
      this.environment,
      this.provenance,
      semanticOwner,
    );
    publications.push({ namespaceRegistry, node, layout: this.reference(node, context.transforms ?? []) });
    return { output, layouts, publications };
  }

  /** 保持 Core 的声明可见性顺序，Path 在所属容器收尾后计算 */
  private reconcileChildren(
    input: ReadonlyArray<IRChild> = this.source.children,
    container: WeaveContainerCompileContext = {
      parent: this.root,
      namespaceRegistry: this.namespace,
      ids: this.state.editNodeAttribute(this.root, 'ids'),
      options: { context: resolveScopeContext(this.source, this.environment), irPath: 'scene' },
      owner: this.provenance.root,
      prefix: '',
    },
  ): {
    outputs: (transforms?: ReadonlyArray<Transform>) => Array<CompileOutput>;
    layouts: Array<NodeLayout>;
    publications: Array<Publication>;
  } {
    const { parent, namespaceRegistry, ids, options: context, owner, prefix } = container;
    const outputs = new Map<WeaveNode, CompileOutput | undefined>();
    const layouts: Array<NodeLayout> = [];
    const publications: Array<Publication> = [];
    // path 编译队列，延后编译 path
    const pathCompileQueue: Array<(transforms?: ReadonlyArray<Transform>) => void> = [];
    const owners = this.provenance.createChildOwners(input, owner, false);

    for (const [index, child] of input.entries()) {
      if ('namespace' in child)
        throw new RetikzReconcilerError(
          RetikzReconcilerErrorCode.Contract,
          'Composite input requires the Core full preparation boundary',
        );
      const irPath = formatCompileChildPath(prefix, index, child.type);
      const occurrence = { sourcePath: irPath, expansionPath: [] };
      const call: WeaveElementCompileContext['options'] = {
        ...context,
        environment: this.environment,
        observation: this.observation,
        namespace: namespaceRegistry.namespace,
        irPath,
        occurrence,
      };
      const semanticOwner = owners[index];
      const element: WeaveElementCompileContext = { container, options: call, owner: semanticOwner };
      const node = this.updating
        ? this.state.readNode(parent).children[index]
        : this.createNode(child, parent, context.context);
      if (!jsonStructuralEquals(this.state.readNode(node).input.context, context.context)) {
        this.state
          .editNodeAttribute(node, 'pendingInputs')
          .push({ source: 'context', changes: new Set(['style', 'layout']) });
        this.invalidate(node);
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
        return this.state.readNode(parent).children.flatMap(node => {
          const output = outputs.get(node);
          return output === undefined ? [] : [output];
        });
      },
      layouts,
      publications,
    };
  }

  /** 首次编译基础树并组装可提交产物 */
  mount(): WeaveCompilation {
    if (this.completed !== undefined)
      throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave is already mounted');
    try {
      const result = this.reconcileChildren();
      const compilation = assembleSceneCompilation(this.source, result.outputs(), this.environment, {
        observation: this.observation,
        diagnostics: this.diagnostics,
        provenanceTracker: this.provenance,
      });
      // 新树尚未对外发布；Runtime 再原子发布整棵树及输出
      this.state.commit();
      this.state.finish();
      this.completed = { root: this.root, visited: this.visited, compilation };
      return this.completed;
    } catch (error) {
      this.state.rollback();
      throw error;
    }
  }
}

/** 编译基础声明树；所有可变状态属于本次候选，失败时由调用方放弃 */
export const prepareWeaveCompilation = (
  source: IRScene,
  options: Omit<CompileOptions, keyof CompileCompositeOptions> = {},
  execution: SceneCompilationPreparationOptions = {},
): WeaveCompilation => new WeaveReconciler(source, options, execution).mount();
