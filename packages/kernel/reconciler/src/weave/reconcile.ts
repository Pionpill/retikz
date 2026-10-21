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
} from '@retikz/core';
import type {
  CompileNamespaceRegistry,
  CompileWarning,
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
import { WeaveStateTransaction } from './state';
import type {
  WeaveDependencyKind,
  WeaveNode,
  WeaveRoot,
  WeaveScopeNode,
  WeavePathNode,
  WeaveShapeNode,
  WeaveCoordinateNode,
} from './types';

/** 本次完整基础树准备结果 */
export type WeaveCompilation = {
  /** 已完成编译的声明根 */
  root: WeaveRoot;
  /** 可交给 Runtime 提交的完整输出 */
  compilation: PreparedSceneCompilation<readonly []>;
  /** 本次编译的基础声明数 */
  visited: number;
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
  /** 当前用户 id 索引 */
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

let nextTreeId = 0;

/** 判断输入是否全部为基础元素，不运行 Composite 或解释其输出 */
export const isWeaveScene = (source: IRScene): boolean => {
  const visit = (children: ReadonlyArray<IRChild>): boolean =>
    children.every(child => !('namespace' in child) && (child.type !== 'scope' || visit(child.children)));
  return visit(source.children);
};

/** 协调声明树、Core 编译与依赖记录；当前每次准备独占可变状态 */
class WeaveReconciler {
  private readonly environment: ReturnType<typeof createCompileEnvironment>;
  private readonly observation: ReturnType<typeof createCompileObservationRuntime> | undefined;
  private readonly provenance = createCompileProvenanceTracker();
  private readonly diagnostics: Array<CompileWarning> = [];
  private readonly namespace = createCompileNamespaceRegistry(undefined, warning => this.diagnostics.push(warning));
  private readonly treeId: string;
  private nextScopeId = 0;
  private visited = 0;
  private readonly root: WeaveRoot;
  private readonly state: WeaveStateTransaction;
  private readonly bindings = new Map<object, WeaveNode>();

  constructor(
    private readonly source: IRScene,
    options: Omit<CompileOptions, keyof CompileCompositeOptions>,
    execution: SceneCompilationPreparationOptions,
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
    this.state.editAttribute(this.root, 'scopeIds').set(this.root.scopeId, this.root);
  }

  /** 保存本元素读取与诊断，建立本版本双向计算关联 */
  private record<T>(node: WeaveNode, result: ElementCompileResult<T>, append = false): T {
    // 登记读取记录与诊断
    const previous = append ? this.state.read(this.root).records.get(node) : undefined;
    const reads = [...(previous?.reads ?? []), ...result.reads];
    this.state.editAttribute(this.root, 'records').set(node, {
      reads,
      diagnostics: [...(previous?.diagnostics ?? []), ...(result.status === 'compiled' ? result.diagnostics : [])],
    });

    // 重新构建拓扑关系
    for (const producer of this.state.read(node).dependencies.keys())
      this.state.editAttribute(producer, 'consumers').delete(node);
    this.state.editAttribute(node, 'dependencies').clear();
    for (const read of reads) {
      const producer = read.binding === undefined ? undefined : this.bindings.get(read.binding);
      if (producer === undefined) continue;
      this.state.editAttribute(node, 'dependencies').set(producer, [null]);
      this.state.editAttribute(producer, 'consumers').add(node);
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
        const compiled = this.state.read(node).compiled;
        if (compiled !== null) return projectCompileReference({ type: 'node', compiled }, this.environment, transforms);
        break;
      }
      case 'coordinate': {
        const compiled = this.state.read(node).compiled;
        if (compiled !== null)
          return projectCompileReference({ type: 'coordinate', compiled }, this.environment, transforms);
        break;
      }
      case 'scope': {
        const compiled = this.state.read(node).compiled;
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
        this.state.editAttribute(this.root, 'scopeIds').set(node.scopeId, node);
        break;
      }
      default:
        node = {
          type: 'path',
          current: null,
          pending: { ...base, input: { own: childElement, context }, compiled: null },
        };
    }
    this.state.edit(node);
    this.state.editAttribute(parentWeaveNode, 'children').push(node);
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
      this.state.read(node).compiled === null
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
    const entry = this.state.read(this.root).records.get(node);
    if (entry !== undefined && this.diagnostics.length > warningCount) {
      this.state.editAttribute(this.root, 'records').set(node, {
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
    const state = this.state.edit(node);
    const { options, container, owner } = element;
    state.compiled = this.record(node, compileNode(state.input.own, options));
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
    const state = this.state.edit(node);
    const { options, container, owner } = element;
    state.compiled = this.record(node, compileCoordinate(state.input.own, options));
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
    const state = this.state.edit(node);
    const call = element.options;
    state.compiled = this.record(
      node,
      compilePath(state.input.own, {
        ...call,
        transforms: transforms ?? call.transforms,
      }),
    );
    return this.collectOutput(state.compiled.output, 'path', element.owner);
  }

  /** 依次完成 Scope 准备、子树、包络、引用投影与输出包装 */
  private reconcileScope(
    node: WeaveScopeNode,
    child: IRScope,
    element: WeaveElementCompileContext,
  ): { output: CompileOutput; layouts: Array<NodeLayout>; publications: Array<Publication> } {
    const state = this.state.edit(node);
    const { namespaceRegistry, ids, options: context } = element.container;
    const { options: call, owner: semanticOwner } = element;
    const occurrence = call.occurrence;
    const irPath = call.irPath;
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
      ids: state.ids === undefined ? ids : this.state.editAttribute(node, 'ids'),
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
    state.compiled = this.record(node, compileScope(state.input.own, prepared, nested.layouts, call), true);
    for (const dependency of state.children) {
      if (dependency.type === 'path') continue;
      this.state.editAttribute(node, 'dependencies').set(dependency, [null]);
      this.state.editAttribute(dependency, 'consumers').add(node);
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
      ids: this.state.editAttribute(this.root, 'ids'),
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
      this.visited++;
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
      const node = this.createNode(child, parent, context.context);
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
        return this.state.read(parent).children.flatMap(node => {
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
      return { root: this.root, visited: this.visited, compilation };
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
