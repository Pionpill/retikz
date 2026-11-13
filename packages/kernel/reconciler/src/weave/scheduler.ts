import type { AnyCompositeDefinition, IRScene, IRChild, CompileWarning } from '@retikz/core';
import {
  projectLayoutWithTransform,
  projectScopeCompileLayouts,
  BuiltinCompileWarningCode,
  projectPublishedReference,
  selectCompositeInputScope,
  RetikzCoreError,
  RetikzCoreErrorCode,
  registerFatalProbeError,
} from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import { compareProperties, createIdAllocator, jsonStructuralEquals } from '@retikz/foundation';

import {
  assembleCompileSubtree,
  finalizeSceneCompilation,
  CompileElementExecutor,
  prepareScopeExecution,
  bindScopeOutputAnimations,
  createTreePositionContext,
  shouldEmitScopeGroup,
  assembleCoordinateOutput,
  assembleNodeOutput,
  assemblePathOutputs,
  queuePathChild,
} from '../compile/execution';
import type { SubtreeCompileRuntime, SubtreeCompileState, ScopeExecutionSteps } from '../compile/execution';
import type { CompileNamespaceKey, CompileOwnerKey } from '../compile/provenance';
import type { CompileRuntime, NamespaceFrameChange, NamespaceEntry } from '../compile/runtime';
import { NamespaceStack, createExecutionInvariantError } from '../compile/runtime';
import { importSceneResources, createDuplicateWarning } from '../compile/shared';
import { captureWeaveContribution, materializeWeaveContribution, materializeWeaveOutput } from './contribution';
import { executeWeaveCoordinate } from './coordinate';
import { executeWeaveNode } from './node';
import { executeWeavePath } from './path';
import { WeaveTaskQueue } from './schedule';
import type { WeaveTaskAddress } from './schedule';
import { assembleWeaveScopeOutput, executeWeaveScope, resolveWeaveScope } from './scope';
import type { WeaveContribution, WeaveContributionRead, WeaveReferenceRead } from './shared';
import type { WeaveNode, WeaveRoot, WeaveScopeNode, WeaveCacheMetadata } from './shared';
import { compareReferenceGeometry, matchWeaveReferences } from './shared';
import type { WeaveNameIndex } from './state';
import type { WeaveTransaction } from './state';

/** 候选直接变化与完成确认；依赖在读取点核对实际结果 */
export type WeaveUpdateRequest = {
  /** 本次通知对应的稳定作者身份 */
  node: WeaveNode;
  /** 自身输入未变时可以核对的旧贡献 */
  check?: WeaveContribution;
  /** 本批声明变化 */
  inputs: NonNullable<WeaveNode['pending']>['pendingInputs'];
  /** 完成后清除输入通知 */
  consume: () => void;
};

/** 仅在本批存在的独立执行环境，不从作者子树遍历捕获 */
type WeaveElementExecution = {
  runtime: CompileRuntime;
  executor: CompileElementExecutor;
  frame: SubtreeCompileRuntime;
  bindings: ReadonlyArray<NamespaceFrameChange>;
  /** Composite 准备和延迟路径的实际读取 */
  reads?: Array<WeaveContributionRead>;
  /** 准备读取已证实有效，可供延迟输出的反向依赖读取 */
  bindingsReady?: boolean;
  /** 只确认准备读取的 Composite 旧结果，输出读取在输出边界核对 */
  retained?: WeaveContribution;
  scope?: ScopeExecutionSteps;
  /** 包络已就绪但尚未与最终输出一起提交的 Scope 结果 */
  scopeResult?: ReturnType<typeof executeWeaveScope>;
  /** 后代计算前的确定化与准备诊断 */
  scopeDiagnostics?: ReadonlyArray<CompileWarning>;
  /** Scope 准备阶段消费的引用，只保存在 Weave 候选中 */
  scopeReads?: Array<WeaveReferenceRead>;
  /** 当前基础元素输出的来源归属 */
  semanticOwner?: CompileOwnerKey;
};

/** 一个候选批次的执行能力与节点事实 */
export type WeaveExecutionContext = {
  /** 本批作者输入 */
  source: IRScene;
  /** 本次独占计算环境 */
  runtime: CompileRuntime;
  /** 记录基础元素阶段结果 */
  recordComputed: (node: WeaveNode, metadata: WeaveCacheMetadata, reused: boolean) => void;
  /** 保存已完成作者输出 */
  writeContribution: (node: WeaveNode, contribution: WeaveContribution) => void;
  /** 当前声明根 */
  root: WeaveRoot;
  /** 候选状态事务 */
  transaction: WeaveTransaction;
  /** 节点到当前声明位置的索引 */
  paths: ReadonlyMap<WeaveNode, PropertyPath>;
  /** 声明可见性索引 */
  names: WeaveNameIndex;
};

/** 当前驱动选择的复用资格与待计算声明 */
export type WeaveExecutionSelection = {
  /** 判断该节点是否允许使用旧阶段产物 */
  canReuse: (node: WeaveNode) => boolean;
  /** 驱动选定的清洁贡献 */
  retained: ReadonlyMap<string, WeaveContribution>;
  /** 待计算或待验证的声明 */
  pending: Map<string, WeaveUpdateRequest>;
};

/** 执行已选择的候选任务，首屏与更新共用节点计算和组装 */
export const executeWeaveCompilation = <TComposite extends AnyCompositeDefinition>(
  executionContext: WeaveExecutionContext,
  selection: WeaveExecutionSelection,
) => {
  const { source, runtime, recordComputed, writeContribution, root, transaction, paths, names } = executionContext;
  const { canReuse, retained, pending } = selection;
  const keyOf = (node: WeaveNode) => JSON.stringify(paths.get(node));
  const executions = new Map<WeaveNode, WeaveElementExecution>();
  const namespaces = new Map<WeaveRoot | WeaveScopeNode, CompileNamespaceKey>();
  const owners = new Map<WeaveScopeNode, CompileOwnerKey>();
  const scopeIds = createIdAllocator('compile/scope');
  const composer = runtime.state.execution.scopeTransformComposer;
  const tracker = runtime.state.execution.provenanceTracker;
  namespaces.set(root, runtime.state.execution.namespaceStack.identity);
  const rootExecutor = new CompileElementExecutor(source.children, runtime, { compileSubtree: assembleCompileSubtree });
  const rootFrame = rootExecutor.createRootRuntime();

  const prepareAddress = (node: WeaveNode): WeaveTaskAddress => {
    switch (node.type) {
      case 'scope':
        return { node, phase: 'prepare' };
      case 'composite':
        return { node, phase: 'prepare' };
      case 'path':
        return { node, phase: 'compile' };
      default:
        return { node, phase: 'compile' };
    }
  };
  const outputAddress = (node: WeaveNode): WeaveTaskAddress => ({ node, phase: 'output' });
  const ancestorsOf = (node: WeaveNode): Array<WeaveScopeNode> => {
    const ancestors: Array<WeaveScopeNode> = [];
    let parent = transaction.readNode(node).parent;
    while (parent.type !== 'root') {
      ancestors.push(parent);
      parent = transaction.readNode(parent).parent;
    }
    return ancestors;
  };
  const consume = (node: WeaveNode) => {
    pending.get(keyOf(node))?.consume();
    pending.delete(keyOf(node));
  };
  const assembled = new Map<WeaveNode, SubtreeCompileState>();
  /** 子输出可见性变化只更新祖先分组输出，不失效子布局 */
  const changedOutputs = new Set<WeaveScopeNode>();
  /** ⚡仅在真实读取点反查尚可能变化的上游，不预遍历消费者闭包 */
  const mayChange = (node: WeaveNode, seen = new Set<WeaveNode>()): boolean => {
    if (pending.has(keyOf(node)) || executions.has(node)) return true;
    if (seen.has(node)) return false;
    seen.add(node);
    const state = transaction.readNode(node);
    for (const producer of state.dependencies.keys()) if (mayChange(producer, seen)) return true;
    for (const ancestor of ancestorsOf(node)) {
      if (pending.has(keyOf(ancestor)) || executions.has(ancestor)) return true;
      for (const [producer, kinds] of transaction.readNode(ancestor).dependencies)
        if (kinds.some(kind => kind !== 'layout') && mayChange(producer, seen)) return true;
    }
    return false;
  };
  const descendants = function* (scope: WeaveScopeNode): Generator<WeaveNode> {
    for (const child of transaction.readNode(scope).children) {
      yield child;
      if (child.type === 'scope') yield* descendants(child);
    }
  };
  const checking = new Set<WeaveNode>();
  const checked = new Set<WeaveNode>();
  const notify = (node: WeaveNode) => {
    assembled.delete(node);
    for (const ancestor of ancestorsOf(node)) assembled.delete(ancestor);
    if (!pending.has(keyOf(node)) && !executions.has(node))
      pending.set(keyOf(node), {
        node,
        check: node.current?.contribution,
        inputs: [],
        consume: () => {},
      });
    queue.request(prepareAddress(node));
    queue.request(outputAddress(node));
  };
  const ensureDependencies = (node: WeaveNode) => {
    if (checking.has(node) || checked.has(node)) return;
    checking.add(node);
    const parent = transaction.readNode(node).parent;
    if (parent.type !== 'root' && !checking.has(parent)) ensure(parent);
    for (const [producer, kinds] of transaction.readNode(node).dependencies) {
      if (kinds.every(kind => kind === 'layout') || checking.has(producer)) continue;
      ensure(producer);
    }
    checking.delete(node);
    checked.add(node);
  };
  const ensure = (node: WeaveNode) => {
    if (!mayChange(node)) return;
    ensureDependencies(node);
    if (pending.has(keyOf(node))) queue.require(prepareAddress(node));
  };
  const requireProjection = (node: WeaveScopeNode) => {
    ensure(node);
    if (!executions.has(node) && mayChange(node)) {
      for (const child of transaction.readNode(node).children) {
        if (child.type === 'scope') requireProjection(child);
        else if (child.type !== 'path') ensure(child);
      }
      ensure(node);
    }
    if (executions.has(node)) queue.require({ node, phase: 'project' });
  };
  const namespaceOf = (node: WeaveNode) => {
    const owner = names.namespaceOf(node);
    let identity = namespaces.get(owner);
    if (identity === undefined) {
      identity = Object.freeze({}) as CompileNamespaceKey;
      namespaces.set(owner, identity);
    }
    return identity;
  };
  /** 从父级稳定事实取得环境，只为计算或必要 Scope 输出建立上下文 */
  const contextOf = (parent: WeaveRoot | WeaveScopeNode): SubtreeCompileRuntime['context'] => {
    if (parent.type === 'root') return rootFrame.context;
    const execution = executions.get(parent);
    if (execution?.scope !== undefined) return execution.scope.childFrame.context;
    const state = transaction.readNode(parent);
    const outer = contextOf(state.parent);
    const transforms = state.cache?.scopePreparation?.preliminaryTransforms;
    return {
      ...outer,
      inheritance: state.canon!.inheritance,
      pathPrefix: paths.get(parent)!,
      compileOwner: ownerOf(parent),
      compositeInput:
        outer.compositeInput === undefined
          ? undefined
          : selectCompositeInputScope(outer.compositeInput, ['children', paths.get(parent)!.at(-1) as number]),
      transformChains:
        transforms === undefined ? outer.transformChains : composer.append(outer.transformChains, transforms),
    };
  };
  const ownerOf = (node: WeaveScopeNode): CompileOwnerKey | undefined => {
    if (tracker === undefined) return;
    let owner = owners.get(node);
    if (owner === undefined) {
      const state = transaction.readNode(node);
      const parent = state.parent.type === 'root' ? tracker.root : ownerOf(state.parent)!;
      owner = tracker.createOwner(
        { ...state.input.own, children: [] },
        paths.get(node)!.at(-1) as number,
        parent,
        false,
        namespaceOf(node),
      );
      owners.set(node, owner);
    }
    return owner;
  };
  const scopeFacts = (node: WeaveScopeNode) => {
    const scope = executions.get(node)?.scope;
    const current = transaction.readNode(node);
    return {
      compiled: scope?.compiled ?? current.compiled!,
      preparation: scope?.preparation ?? current.cache!.scopePreparation!,
      transforms: scope?.transforms ?? current.compiled!.layout.overall.transforms,
      context: executions.get(node)?.frame.context ?? contextOf(current.parent),
    };
  };
  /** ⚡清洁贡献直接物化输出，不进入元素执行器或候选写入 */
  const outputOf = (node: WeaveNode): SubtreeCompileState => {
    if (pending.has(keyOf(node))) queue.require(prepareAddress(node));
    const execution = executions.get(node);
    if (execution !== undefined) {
      queue.require(outputAddress(node));
      for (const primitive of execution.frame.state.primitives) {
        if (primitive.type === 'path-placeholder') continue;
        const zIndex = execution.executor.output.zIndexMap.get(primitive);
        if (zIndex !== undefined) rootExecutor.output.zIndexMap.set(primitive, zIndex);
      }
      return execution.frame.state;
    }
    const cached = assembled.get(node);
    if (cached !== undefined) return cached;
    const state = transaction.readNode(node);
    if (node.type !== 'scope') {
      const contribution = state.contribution!;
      for (const warning of contribution.diagnostics)
        if (warning.code !== BuiltinCompileWarningCode.DuplicateNodeId)
          runtime.state.workspace.diagnosticCollector.collect(warning);
      const parent = state.parent.type === 'root' ? tracker?.root : ownerOf(state.parent);
      const owner =
        parent === undefined
          ? undefined
          : tracker?.createOwner(
              state.input.own as IRChild,
              paths.get(node)!.at(-1) as number,
              parent,
              false,
              namespaceOf(node),
            );
      const result = materializeWeaveOutput(runtime, rootExecutor.output, contribution, owner, namespaceOf(node));
      assembled.set(node, result);
      return result;
    }
    const scope = transaction.readNode(node);
    const childState = emptyOutput();
    for (const child of scope.children) appendState(childState, outputOf(child));
    const result = emptyOutput();
    importSceneResources(
      scope.cache?.resources ?? { paints: [], clips: [] },
      runtime.state.workspace.paintRegistry,
      runtime.state.workspace.clipRegistry,
    );
    for (const warning of scope.cache?.diagnostics ?? [])
      if (warning.code !== BuiltinCompileWarningCode.DuplicateNodeId)
        runtime.state.workspace.diagnosticCollector.collect(warning);
    let compiled = scope.compiled!;
    let outputDiagnostics = scope.cache?.outputDiagnostics ?? [];
    if (changedOutputs.has(node)) {
      const context = contextOf(scope.parent);
      const bound = bindScopeOutputAnimations(scope.canon!, compiled, childState.primitives.length, {
        layouts: childState.geometries,
        positionContext: createTreePositionContext(runtime, context.transformChains),
        irPath: paths.get(node)!,
        onWarn: runtime.state.workspace.diagnosticCollector.collect,
        registerClip: runtime.state.workspace.clipRegistry.register,
        registerClipPath: runtime.state.workspace.clipRegistry.registerPath,
      });
      if (bound.compiled !== compiled || !jsonStructuralEquals(outputDiagnostics, bound.diagnostics)) {
        transaction.editNode(node).compiled = bound.compiled;
        recordComputed(node, { ...scope.cache!, outputDiagnostics: bound.diagnostics }, bound.compiled === compiled);
      }
      compiled = bound.compiled;
      outputDiagnostics = bound.diagnostics;
    }
    for (const warning of outputDiagnostics) runtime.state.workspace.diagnosticCollector.collect(warning);
    assembleWeaveScopeOutput(
      runtime,
      rootExecutor.output,
      scope.input.own,
      compiled,
      childState,
      { context: contextOf(scope.parent), state: result },
      ownerOf(node),
    );
    assembled.set(node, result);
    return result;
  };
  const emptyOutput = (): SubtreeCompileState => ({
    primitives: [],
    paths: [],
    geometries: [],
    publications: [],
    bounds: [],
    allocations: [],
    alignmentGuides: [],
    artifacts: [],
  });
  /** 包络读取清洁布局，不提前物化绘制或来源所有者 */
  const layoutOf = (node: WeaveNode): WeaveContribution['output'] | SubtreeCompileState => {
    if (node.type !== 'scope') return transaction.readNode(node).contribution!.output;
    const state = transaction.readNode(node);
    const children = emptyOutput();
    for (const child of state.children) {
      if (child.type === 'path') continue;
      ensure(child);
      if (child.type === 'scope') requireProjection(child);
      appendState(children, executions.get(child)?.frame.state ?? layoutOf(child));
    }
    const result = emptyOutput();
    const compiled = state.compiled!;
    result.geometries.push(
      ...projectScopeCompileLayouts(
        state.input.own,
        { shape: compiled.shape, boundary: compiled.boundary, geometry: compiled.layout.overall.geometry },
        children.geometries,
        compiled.layout.overall.transforms,
      ),
    );
    result.primitives.push(...children.primitives);
    return result;
  };
  const appendState = (
    destination: SubtreeCompileState,
    contribution: SubtreeCompileState | WeaveContribution['output'],
  ) => {
    destination.primitives.push(...contribution.primitives);
    destination.geometries.push(...contribution.geometries);
    destination.publications.push(...contribution.publications);
    destination.bounds.push(...contribution.bounds);
    destination.allocations.push(...contribution.allocations);
    destination.alignmentGuides.push(...contribution.alignmentGuides);
    destination.artifacts.push(...contribution.artifacts);
  };

  /** 贡献携带局部输出，作用域输入变化时交回阶段级 prepared 比较 */
  const contextMatches = (node: WeaveNode, finalParent = false, inheritance = true): boolean => {
    if (
      inheritance &&
      !compareProperties(node.current?.input.context, executions.get(node)!.frame.context.inheritance, { depth: 2 })
    )
      return false;
    const ancestors = ancestorsOf(node);
    for (const [index, ancestor] of ancestors.entries()) {
      ensure(ancestor);
      const facts = scopeFacts(ancestor);
      if (
        !jsonStructuralEquals(
          ancestor.current?.cache?.scopePreparation?.preliminaryTransforms,
          facts.preparation.preliminaryTransforms,
        )
      )
        return false;
      if (finalParent && index === 0) {
        requireProjection(ancestor);
        if (
          !jsonStructuralEquals(ancestor.current?.compiled?.layout.overall.transforms, scopeFacts(ancestor).transforms)
        )
          return false;
      }
    }
    return true;
  };

  /** 将发布时的初步世界几何投影到消费者当前可见的闭合 Scope */
  const projectBinding = (
    entry: NamespaceEntry,
    producer: WeaveNode,
    consumer: WeaveNode,
    closed: boolean,
  ): NamespaceEntry => {
    let geometry = entry.geometry;
    const consumerAncestors = ancestorsOf(consumer);
    for (const scope of ancestorsOf(producer)) {
      if (consumerAncestors.includes(scope) && !(closed && consumerAncestors[0] === scope)) continue;
      requireProjection(scope);
      const steps = scopeFacts(scope);
      const preliminary = steps.preparation.preliminaryTransforms;
      const post =
        preliminary === undefined
          ? steps.transforms
          : steps.transforms.slice(0, steps.transforms.length - preliminary.length);
      geometry = projectPublishedReference(geometry, steps.context.transformChains, post);
    }
    return { ...entry, geometry };
  };

  const lookup = (consumer: WeaveNode, name: string, closed: boolean): NamespaceEntry | undefined => {
    const binding = names.lookup({ consumer, name, visibility: closed ? 'closed' : 'declaration' }, node => {
      if (node === consumer) return executions.get(node)?.bindings ?? [];
      ensure(node);
      if (executions.has(node) && !executions.get(node)!.bindingsReady) queue.require(prepareAddress(node));
      return executions.get(node)?.bindings ?? node.current?.contribution?.bindings ?? [];
    });
    if (binding === undefined) return;
    const producer = binding.node;
    if (producer.type === 'scope' && ancestorsOf(consumer).includes(producer)) {
      const error = new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `Geometry reference cannot target ancestor Scope '${name}'`,
      );
      registerFatalProbeError(error);
      throw error;
    }
    if (producer.type === 'scope') {
      requireProjection(producer);
      const facts = scopeFacts(producer);
      const compiled = facts.compiled;
      const intrinsic = {
        shape: compiled.shape,
        boundary: compiled.boundary,
        geometry: compiled.layout.overall.geometry,
      };
      const geometry = projectLayoutWithTransform(
        intrinsic,
        composer.resolve(composer.append(facts.context.transformChains, compiled.layout.overall.transforms)),
      );
      return projectBinding(
        { producer, state: 'resolved', scopeId: producer.scopeId, irPath: binding.path, geometry },
        producer,
        consumer,
        closed,
      );
    }
    ensure(producer);
    if (executions.has(producer) && !executions.get(producer)!.bindingsReady) queue.require(prepareAddress(producer));
    const published =
      binding.generated ??
      (executions.get(producer)?.bindings ?? producer.current?.contribution?.bindings ?? []).find(
        change => change.id === name,
      );
    return published === undefined ? undefined : projectBinding(published.entry, producer, consumer, closed);
  };

  const initialize = (node: WeaveNode): WeaveElementExecution => {
    const existing = executions.get(node);
    if (existing !== undefined) return existing;
    const parent = transaction.readNode(node).parent;
    if (parent.type !== 'root' && pending.has(keyOf(parent))) queue.require(prepareAddress(parent));
    const parentContext = contextOf(parent);
    const state = transaction.editNode(node);
    state.input = { ...state.input, context: parentContext.inheritance };
    const namespaceOwner = names.namespaceOf(node);
    let identity = namespaces.get(namespaceOwner);
    if (identity === undefined) {
      identity = Object.freeze({}) as CompileNamespaceKey;
      namespaces.set(namespaceOwner, identity);
    }
    const namespace: NamespaceStack = new NamespaceStack(
      {
        rootIdentity: identity,
        lookupExternal: name => lookup(node, name, namespace.isResolving && namespace.scopeDepth === 0),
        onDuplicate: info => {
          if (info.frameDepth === 0) return;
          const outerDepth = ancestorsOf(node).filter(
            scope => transaction.readNode(scope).input.own.localNamespace,
          ).length;
          runtime.state.workspace.diagnosticCollector.collect(
            createDuplicateWarning({ ...info, frameDepth: info.frameDepth + outerDepth }),
          );
        },
      },
      scopeIds,
    );
    const candidate: CompileRuntime = {
      ...runtime,
      state: { ...runtime.state, execution: { ...runtime.state.execution, namespaceStack: namespace } },
    };
    const executor = new CompileElementExecutor([], candidate, { compileSubtree: assembleCompileSubtree });
    let chains = parentContext.transformChains;
    if (node.type === 'path' && parent.type !== 'root') {
      requireProjection(parent);
      const facts = scopeFacts(parent);
      chains = composer.append(facts.context.transformChains, facts.transforms);
    }
    const frame = { context: { ...parentContext, transformChains: chains }, state: executor.createRootRuntime().state };
    const execution = { runtime: candidate, executor, frame, bindings: [] };
    executions.set(node, execution);
    return execution;
  };

  /** 按声明顺序聚合局部产物，不进行领域计算或发现环境 */
  const append = (
    destination: SubtreeCompileState,
    execution: WeaveElementExecution,
    output: CompileElementExecutor['output'],
  ) => {
    const state = execution.frame.state;
    destination.primitives.push(...state.primitives);
    destination.geometries.push(...state.geometries);
    destination.publications.push(...state.publications);
    destination.bounds.push(...state.bounds);
    destination.allocations.push(...state.allocations);
    destination.alignmentGuides.push(...state.alignmentGuides);
    destination.artifacts.push(...state.artifacts);
    for (const primitive of state.primitives) {
      if (primitive.type === 'path-placeholder') continue;
      const zIndex = execution.executor.output.zIndexMap.get(primitive);
      if (zIndex !== undefined) output.zIndexMap.set(primitive, zIndex);
    }
  };

  /** 计算作者 Composite，并将本次读取事实留在候选工作区 */
  const executeComposite = (node: Extract<WeaveNode, { type: 'composite' }>, execution: WeaveElementExecution) => {
    const state = transaction.readNode(node);
    const path = paths.get(node)!;
    const reads: Array<WeaveContributionRead> = [];
    execution.reads = reads;
    execution.retained = undefined;
    const namespace = execution.runtime.state.execution.namespaceStack;
    execution.bindings = namespace.captureFrameChanges(() =>
      namespace.observeReferences(
        (name, entry, kind) => reads.push({ name, entry, kind, readiness: 'prepare' }),
        () =>
          namespace.withProducer(node, () => {
            execution.semanticOwner = execution.executor.compileChild(
              state.input.own,
              path.at(-1) as number,
              execution.frame,
              state.parent.type === 'root',
            );
          }),
      ),
    );
  };

  const queue = new WeaveTaskQueue(
    task => {
      const node = task.node;
      const path = paths.get(node)!;
      const index = path.at(-1) as number;
      if (task.phase === 'output') {
        queue.require(prepareAddress(node));
        const execution = executions.get(node)!;
        if (node.type === 'composite') {
          if (execution.retained !== undefined) {
            const retainedContribution = execution.retained;
            const outputReads = retainedContribution.reads.filter(
              read => read.readiness === 'output' && read.entry?.producer !== node,
            );
            const valid =
              contextMatches(node, true) &&
              matchWeaveReferences(outputReads, { lookupReference: name => lookup(node, name, true) });
            for (const field of Object.values(execution.frame.state)) field.length = 0;
            if (valid) {
              const state = transaction.readNode(node);
              const parent = execution.frame.context.compileOwner;
              execution.semanticOwner =
                parent === undefined
                  ? undefined
                  : tracker?.createOwner(state.input.own, index, parent, false, namespaceOf(node));
              appendState(
                execution.frame.state,
                materializeWeaveOutput(
                  execution.runtime,
                  execution.executor.output,
                  retainedContribution,
                  execution.semanticOwner,
                ),
              );
            } else {
              executeComposite(node, execution);
            }
          }
          const parent = transaction.readNode(node).parent;
          if (parent.type !== 'root') {
            requireProjection(parent);
            const steps = scopeFacts(parent);
            const preliminary = steps.preparation.preliminaryTransforms;
            const post =
              preliminary === undefined
                ? steps.transforms
                : steps.transforms.slice(0, steps.transforms.length - preliminary.length);
            for (const geometry of execution.frame.state.publications) {
              const projected = projectPublishedReference(geometry, steps.context.transformChains, post);
              execution.runtime.state.execution.namespaceStack.replacePublishedGeometry(geometry, projected);
            }
            for (const deferred of execution.frame.state.paths)
              deferred.scopeChain = composer.insert(deferred.scopeChain, steps.context.transformChains.length, post);
          }
        }
        if (node.type === 'scope') {
          requireProjection(node);
          const steps = execution.scope!;
          // 包络已完成；此后只替换输出收集，不改变其布局事实
          steps.childFrame.state.primitives.length = 0;
          steps.childFrame.state.bounds.length = 0;
          steps.childFrame.state.allocations.length = 0;
          steps.childFrame.state.alignmentGuides.length = 0;
          for (const child of transaction.readNode(node).children) {
            const childState = outputOf(child);
            steps.childFrame.state.primitives.push(...childState.primitives);
            steps.childFrame.state.bounds.push(...childState.bounds);
            steps.childFrame.state.allocations.push(...childState.allocations);
            steps.childFrame.state.alignmentGuides.push(...childState.alignmentGuides);
            for (const primitive of childState.primitives) {
              if (primitive.type === 'path-placeholder') continue;
              const zIndex = rootExecutor.output.zIndexMap.get(primitive);
              if (zIndex !== undefined) execution.executor.output.zIndexMap.set(primitive, zIndex);
            }
          }
          steps.paths();
          steps.dispose();
          const warnings = runtime.state.workspace.diagnosticCollector.warnings;
          const warningCount = warnings.length;
          steps.publish();
          const outputDiagnostics = warnings.slice(warningCount);
          const result = execution.scopeResult!;
          const state = transaction.editNode(node);
          state.canon = result.canon;
          state.compiled = steps.compiled;
          recordComputed(node, { ...result.cache, outputDiagnostics }, result.reused);
        }
        if (node.type === 'path' && execution.retained === undefined) {
          const namespace = execution.runtime.state.execution.namespaceStack;
          namespace.setPhase('resolving');
          try {
            const state = transaction.readNode(node);
            const pendingPath = execution.frame.state.paths[0];
            execution.runtime.state.execution.withWarningOccurrence(pendingPath.occurrence, () =>
              namespace.withProducer(node, () => {
                const result = executeWeavePath(execution.runtime, pendingPath, canReuse(node) ? state : undefined);
                const target = transaction.editNode(node);
                target.canon = result.canon;
                target.compiled = result.compiled;
                recordComputed(node, result.cache, result.reused);
                assemblePathOutputs(execution.runtime, execution.executor.output, [pendingPath], [result.compiled]);
              }),
            );
            execution.frame.state.paths.length = 0;
          } finally {
            namespace.setPhase('registering');
          }
        }
        if (node.type === 'composite' && execution.reads !== undefined) {
          const reads = execution.reads;
          execution.runtime.state.execution.namespaceStack.observeReferences(
            (name, entry, kind) => reads.push({ name, entry, kind, readiness: 'output' }),
            () => execution.executor.finish(execution.frame.state),
          );
        } else execution.executor.finish(execution.frame.state);
        if (node.type !== 'scope' && execution.retained === undefined) {
          const metadata = transaction.readNode(node).cache;
          writeContribution(
            node,
            captureWeaveContribution(
              execution.runtime,
              execution.executor.output,
              execution.frame.state,
              execution.bindings,
              execution.reads ??
                metadata!.reads.map(read => ({ ...read, readiness: node.type === 'path' ? 'output' : 'prepare' })),
              { sourcePath: path, expansionPath: [] },
              execution.semanticOwner,
            ),
          );
        }
        consume(node);
        return;
      }
      if (node.type === 'scope' && task.phase === 'project') {
        queue.require(prepareAddress(node));
        const execution = executions.get(node)!;
        const steps = execution.scope!;
        for (const child of transaction.readNode(node).children) {
          if (child.type === 'path') continue;
          if (child.type === 'scope') requireProjection(child);
          else ensure(child);
          if (executions.has(child)) append(steps.childFrame.state, executions.get(child)!, execution.executor.output);
          else appendState(steps.childFrame.state, layoutOf(child));
        }
        const state = transaction.readNode(node);
        const result = executeWeaveScope(
          execution.runtime,
          state.input.own,
          execution.frame.context,
          steps,
          execution.scopeDiagnostics ?? [],
          execution.scopeReads ?? [],
          canReuse(node) ? state : undefined,
        );
        execution.scopeResult = result;
        steps.project(result.compiled);
        return;
      }
      ensureDependencies(node);
      const execution = initialize(node);
      const { executor, frame } = execution;
      const state = transaction.readNode(node);
      if (node.type === 'scope') {
        const own = transaction.readNode(node).input.own;
        const owner = ownerOf(node);
        const scopeFrame = {
          ...frame,
          context: {
            ...frame.context,
            compositeInput:
              frame.context.compositeInput === undefined
                ? undefined
                : selectCompositeInputScope(frame.context.compositeInput, ['children', index]),
          },
        };
        const warningCount = runtime.state.workspace.diagnosticCollector.warnings.length;
        const canon = resolveWeaveScope(
          execution.runtime,
          { ...own, children: [] },
          path,
          scopeFrame.context,
          canReuse(node) ? transaction.readNode(node) : undefined,
        );
        const scopeReads: Array<WeaveReferenceRead> = [];
        execution.scopeReads = scopeReads;
        execution.scope = execution.runtime.state.execution.namespaceStack.observeReferences(
          (name, entry, kind) => scopeReads.push({ name, entry, kind }),
          () =>
            prepareScopeExecution(
              execution.runtime,
              executor.output,
              {
                compileChildren: () => {
                  throw createExecutionInvariantError('Authored Scope cannot traverse children during update');
                },
              },
              {},
              { ...own, children: [] },
              index,
              scopeFrame,
              undefined,
              0,
              owner,
              undefined,
              undefined,
              canon,
            ),
        );
        execution.scopeDiagnostics = runtime.state.workspace.diagnosticCollector.warnings.slice(warningCount);
        if (
          !contextMatches(node, false, false) ||
          !compareProperties(node.current?.canon?.inheritance, execution.scope.childFrame.context.inheritance, {
            depth: 2,
          }) ||
          !jsonStructuralEquals(
            node.current?.cache?.scopePreparation?.preliminaryTransforms,
            execution.scope.preparation.preliminaryTransforms,
          )
        ) {
          for (const child of transaction.readNode(node).children) notify(child);
        }
        return;
      }
      let contribution = retained.get(keyOf(node)) ?? pending.get(keyOf(node))?.check;
      const namespace = execution.runtime.state.execution.namespaceStack;
      if (contribution !== undefined && !contextMatches(node, node.type === 'path')) contribution = undefined;
      if (contribution !== undefined) {
        const prepareReads = contribution.reads.filter(
          read => read.readiness === 'prepare' && read.entry?.producer !== node,
        );
        if (matchWeaveReferences(prepareReads, namespace)) {
          execution.bindings = contribution.bindings;
          execution.bindingsReady = true;
          if (node.type === 'composite') {
            execution.retained = contribution;
            // 包络只消费准备阶段的局部几何，未核对的旧绘制不进入最终输出
            frame.state.geometries.push(...contribution.output.geometries);
            frame.state.publications.push(...contribution.output.publications);
            frame.state.primitives.push(...contribution.output.primitives);
            frame.state.artifacts.push(...contribution.output.artifacts);
            return;
          }
          const outputReads = contribution.reads.filter(
            read => read.readiness === 'output' && read.entry?.producer !== node,
          );
          if (!matchWeaveReferences(outputReads, { lookupReference: name => lookup(node, name, true) }))
            contribution = undefined;
        } else contribution = undefined;
      }
      if (node.type === 'composite') {
        executeComposite(node, execution);
      } else {
        const occurrence = { sourcePath: path, expansionPath: [] };
        execution.semanticOwner =
          frame.context.compileOwner === undefined
            ? undefined
            : tracker?.createOwner(
                state.input.own as IRChild,
                index,
                frame.context.compileOwner,
                false,
                namespace.identity,
              );
        execution.bindings = namespace.captureFrameChanges(() =>
          namespace.withProducer(node, () =>
            execution.runtime.state.execution.withWarningOccurrence(occurrence, () => {
              if (contribution !== undefined) {
                execution.retained = contribution;
                appendState(
                  frame.state,
                  materializeWeaveContribution(
                    execution.runtime,
                    executor.output,
                    contribution,
                    execution.semanticOwner,
                  ),
                );
                return;
              }
              if (node.type === 'coordinate') {
                const own = transaction.readNode(node).input.own;
                const result = executeWeaveCoordinate(
                  execution.runtime,
                  own,
                  frame.context,
                  canReuse(node) ? transaction.readNode(node) : undefined,
                );
                const target = transaction.editNode(node);
                target.canon = result.canon;
                target.compiled = result.compiled;
                recordComputed(node, result.cache, result.reused);
                assembleCoordinateOutput(execution.runtime, own, path, frame, result.compiled);
              } else if (node.type === 'node') {
                const own = transaction.readNode(node).input.own;
                const result = executeWeaveNode(
                  execution.runtime,
                  own,
                  path,
                  frame.context,
                  canReuse(node) ? transaction.readNode(node) : undefined,
                );
                const target = transaction.editNode(node);
                target.canon = result.canon;
                target.compiled = result.compiled;
                recordComputed(node, result.cache, result.reused);
                assembleNodeOutput(
                  execution.runtime,
                  executor.output,
                  own,
                  path,
                  frame,
                  result.compiled,
                  execution.semanticOwner,
                );
              } else {
                queuePathChild(
                  execution.runtime,
                  executor.output,
                  transaction.readNode(node).input.own,
                  index,
                  frame,
                  occurrence,
                  execution.semanticOwner,
                );
              }
            }),
          ),
        );
      }
      execution.bindingsReady = true;
    },
    task => {
      if (task.phase === 'output') {
        const node = task.node;
        const previousCount = (element: WeaveNode): number => {
          if (element.type !== 'scope') return element.current?.contribution?.output.primitives.length ?? 0;
          const state = element.current;
          if (state?.compiled === undefined || state.compiled === null) return 0;
          return shouldEmitScopeGroup(
            state.children.some(child => previousCount(child) > 0) ? 1 : 0,
            state.compiled.layout.overall.transforms,
            state.compiled.emit.overall.id,
            state.compiled.emit.overall.clipRef !== undefined,
          )
            ? 1
            : 0;
        };
        if (previousCount(node) !== executions.get(node)!.frame.state.primitives.length)
          for (const parent of ancestorsOf(node)) {
            changedOutputs.add(parent);
            assembled.delete(parent);
          }
        return;
      }
      const producer = task.node;
      const state = transaction.readNode(producer);
      const previousBindings = producer.current?.contribution?.bindings ?? [];
      const bindings = executions.get(producer)?.bindings ?? [];
      // 先比较生产者实际输出通道；只通知直接消费者，由其按查询及 prepared 槽位继续核对
      for (const consumer of state.consumers) {
        const kinds = transaction.readNode(consumer).dependencies.get(producer) ?? [];
        const changed =
          producer.type === 'scope'
            ? task.phase === 'project' &&
              !jsonStructuralEquals(
                producer.current?.compiled?.layout.overall,
                executions.get(producer)!.scope!.compiled.layout.overall,
              )
            : kinds.some(kind => {
                if (kind === 'layout')
                  return !jsonStructuralEquals(
                    producer.current?.contribution?.output.geometries,
                    executions.get(producer)!.frame.state.geometries,
                  );
                if (previousBindings.length !== bindings.length) return true;
                return bindings.some((binding, index) => {
                  const previous = previousBindings[index];
                  return (
                    previous.id !== binding.id ||
                    !compareReferenceGeometry(previous.entry.geometry, binding.entry.geometry, kind)
                  );
                });
              });
        if (changed) notify(consumer);
      }
      if (
        producer.type === 'scope' &&
        task.phase === 'project' &&
        !jsonStructuralEquals(
          producer.current?.compiled?.layout.overall.transforms,
          executions.get(producer)!.scope!.transforms,
        )
      ) {
        // 后代局部几何可以复用，世界投影变化只通知其实际消费者
        for (const node of descendants(producer)) {
          if (node.type === 'path' || node.type === 'composite') notify(node);
          for (const consumer of transaction.readNode(node).consumers)
            if (!ancestorsOf(consumer).includes(producer)) notify(consumer);
        }
      }
    },
  );

  for (const { node } of pending.values()) {
    queue.request(prepareAddress(node));
    queue.request(outputAddress(node));
  }
  queue.flush();
  for (const node of executions.keys()) queue.require(outputAddress(node));
  queue.flush();
  const diagnosticNamespace = new NamespaceStack({
    rootIdentity: runtime.state.execution.namespaceStack.identity,
    onDuplicate: info => runtime.state.workspace.diagnosticCollector.collect(createDuplicateWarning(info)),
  });
  const collectDeclarations = (container: WeaveRoot | WeaveScopeNode) => {
    for (const node of transaction.readNode(container).children) {
      if (node.type === 'scope') {
        const own = transaction.readNode(node).input.own;
        if (own.id !== undefined)
          diagnosticNamespace.register(own.id, {
            geometry: { position: [0, 0] },
            irPath: [...paths.get(node)!, 'id'],
          });
        if (own.localNamespace) diagnosticNamespace.pushFrame();
        collectDeclarations(node);
        if (own.localNamespace) diagnosticNamespace.popFrame();
      } else
        for (const binding of executions.get(node)?.bindings ?? node.current?.contribution?.bindings ?? [])
          diagnosticNamespace.commitForkChange(binding);
    }
  };
  collectDeclarations(root);
  for (const node of transaction.readNode(root).children) appendState(rootFrame.state, outputOf(node));
  if (pending.size !== 0) throw createExecutionInvariantError('Weave computations did not reach output readiness');
  return finalizeSceneCompilation<TComposite>(source, runtime, rootExecutor.finish(rootFrame.state));
};
