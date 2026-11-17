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
  assembleCoordinate,
  assembleNode,
  assemblePaths,
  bindScopeOutputAnimations,
  CompileElementExecutor,
  createDuplicateWarning,
  createExecutionInvariantError,
  createTreePositionContext,
  finalizeSceneCompilation,
  importSceneResources,
  NamespaceStack,
  prepareScopeExecution,
  queuePathChild,
  shouldEmitScopeGroup,
} from '../compile';
import type {
  CompileNamespaceKey,
  CompileOwnerKey,
  CompileRuntime,
  NamespaceEntry,
  NamespaceFrameChange,
  ScopeExecutionSteps,
  SubtreeCompileContext,
  SubtreeCompileRuntime,
  SubtreeCompileState,
} from '../compile';
import { captureWeaveContribution, materializeWeaveContribution, materializeWeaveOutput } from './contribution';
import {
  assembleWeaveScopeOutput,
  executeWeaveCoordinate,
  executeWeaveNode,
  executeWeavePath,
  executeWeaveScope,
  resolveWeaveScope,
} from './element';
import { WeaveTaskQueue } from './schedule';
import type { WeaveTaskAddress } from './schedule';
import type { WeaveContribution, WeaveEntry, WeaveReferenceRead, WeaveRoot, WeaveScopeEntry } from './shared';
import { compareReferenceGeometry, matchWeaveReferences } from './shared';
import type { WeaveNameIndex, WeaveTransaction } from './state';

/** 候选直接变化与完成确认；依赖在读取点核对实际结果 */
export type WeaveUpdateRequest = {
  /** 本次通知对应的稳定作者身份 */
  entry: WeaveEntry;
  /** 自身输入未变时可以核对的旧贡献 */
  check?: WeaveContribution;
  /** 本批声明变化 */
  inputs: NonNullable<WeaveEntry['pending']>['pendingInputs'];
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
  reads?: Array<WeaveReferenceRead>;
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

/** 一个候选批次的执行能力与条目事实 */
export type WeaveExecutionContext = {
  /** 本批作者输入 */
  source: IRScene;
  /** 本次独占计算环境 */
  runtime: CompileRuntime;
  /** 记录基础元素阶段结果 */
  recordComputed: <TEntry extends Exclude<WeaveEntry, { type: 'composite' }>>(
    entry: TEntry,
    metadata: NoInfer<NonNullable<NonNullable<TEntry['current']>['compile']>>,
    reused: boolean,
    referenceReads: ReadonlyArray<WeaveReferenceRead>,
  ) => void;
  /** 保存已完成作者输出 */
  writeContribution: (
    entry: WeaveEntry,
    contribution: WeaveContribution,
    referenceReads: ReadonlyArray<WeaveReferenceRead>,
  ) => void;
  /** 当前声明根 */
  root: WeaveRoot;
  /** 候选状态事务 */
  transaction: WeaveTransaction;
  /** 条目到当前声明位置的索引 */
  paths: ReadonlyMap<WeaveEntry, PropertyPath>;
  /** 声明可见性索引 */
  names: WeaveNameIndex;
};

/** 当前驱动选择的复用资格与待计算声明 */
export type WeaveExecutionSelection = {
  /** 判断该条目是否允许使用旧阶段产物 */
  canReuse: (entry: WeaveEntry) => boolean;
  /** 驱动选定的清洁贡献 */
  retained: ReadonlyMap<string, WeaveContribution>;
  /** 待计算或待验证的声明 */
  pending: Map<string, WeaveUpdateRequest>;
};

/** 执行已选择的候选任务，首屏与更新共用条目计算和组装 */
export const executeWeaveCompilation = <TComposite extends AnyCompositeDefinition>(
  executionContext: WeaveExecutionContext,
  selection: WeaveExecutionSelection,
) => {
  const { source, runtime, recordComputed, writeContribution, root, transaction, paths, names } = executionContext;
  const { canReuse, retained, pending } = selection;
  const keyOf = (entry: WeaveEntry) => JSON.stringify(paths.get(entry));
  const executions = new Map<WeaveEntry, WeaveElementExecution>();
  const namespaces = new Map<WeaveRoot | WeaveScopeEntry, CompileNamespaceKey>();
  const owners = new Map<WeaveScopeEntry, CompileOwnerKey>();
  const scopeIds = createIdAllocator('compile/scope');
  const composer = runtime.state.execution.scopeTransformComposer;
  const tracker = runtime.state.execution.provenanceTracker;
  namespaces.set(root, runtime.state.execution.namespaceStack.identity);
  const rootExecutor = new CompileElementExecutor(source.children, runtime, {
    compileSubtree: assembleCompileSubtree,
    skipAllocation: false,
  });
  const rootFrame = rootExecutor.createRootRuntime();

  const prepareAddress = (entry: WeaveEntry): WeaveTaskAddress => {
    switch (entry.type) {
      case 'scope':
        return { entry, phase: 'prepare' };
      case 'composite':
        return { entry, phase: 'prepare' };
      case 'path':
        return { entry, phase: 'compile' };
      default:
        return { entry, phase: 'compile' };
    }
  };
  const outputAddress = (entry: WeaveEntry): WeaveTaskAddress => ({ entry, phase: 'output' });
  const ancestorsOf = (entry: WeaveEntry): Array<WeaveScopeEntry> => {
    const ancestors: Array<WeaveScopeEntry> = [];
    let parent = transaction.readState(entry).parent;
    while (parent.type !== 'root') {
      ancestors.push(parent);
      parent = transaction.readState(parent).parent;
    }
    return ancestors;
  };
  const consume = (entry: WeaveEntry) => {
    pending.get(keyOf(entry))?.consume();
    pending.delete(keyOf(entry));
  };
  const assembled = new Map<WeaveEntry, SubtreeCompileState>();
  /** 子输出可见性变化只更新祖先分组输出，不失效子布局 */
  const changedOutputs = new Set<WeaveScopeEntry>();
  /** ⚡仅在真实读取点反查尚可能变化的上游，不预遍历消费者闭包 */
  const mayChange = (entry: WeaveEntry, seen = new Set<WeaveEntry>()): boolean => {
    if (pending.has(keyOf(entry)) || executions.has(entry)) return true;
    if (seen.has(entry)) return false;
    seen.add(entry);
    const state = transaction.readState(entry);
    for (const producer of state.dependencies.keys()) if (mayChange(producer, seen)) return true;
    for (const ancestor of ancestorsOf(entry)) {
      if (pending.has(keyOf(ancestor)) || executions.has(ancestor)) return true;
      for (const [producer, kinds] of transaction.readState(ancestor).dependencies)
        if (kinds.some(kind => kind !== 'layout') && mayChange(producer, seen)) return true;
    }
    return false;
  };
  const descendants = function* (scope: WeaveScopeEntry): Generator<WeaveEntry> {
    for (const child of transaction.readState(scope).children) {
      yield child;
      if (child.type === 'scope') yield* descendants(child);
    }
  };
  const checking = new Set<WeaveEntry>();
  const checked = new Set<WeaveEntry>();
  const notify = (entry: WeaveEntry) => {
    assembled.delete(entry);
    for (const ancestor of ancestorsOf(entry)) assembled.delete(ancestor);
    if (!pending.has(keyOf(entry)) && !executions.has(entry))
      pending.set(keyOf(entry), {
        entry,
        check: entry.current?.contribution,
        inputs: [],
        consume: () => {},
      });
    queue.request(prepareAddress(entry));
    queue.request(outputAddress(entry));
  };
  const ensureDependencies = (entry: WeaveEntry) => {
    if (checking.has(entry) || checked.has(entry)) return;
    checking.add(entry);
    const parent = transaction.readState(entry).parent;
    if (parent.type !== 'root' && !checking.has(parent)) ensure(parent);
    for (const [producer, kinds] of transaction.readState(entry).dependencies) {
      if (kinds.every(kind => kind === 'layout') || checking.has(producer)) continue;
      ensure(producer);
    }
    checking.delete(entry);
    checked.add(entry);
  };
  const ensure = (entry: WeaveEntry) => {
    if (!mayChange(entry)) return;
    ensureDependencies(entry);
    if (pending.has(keyOf(entry))) queue.require(prepareAddress(entry));
  };
  const requireProjection = (entry: WeaveScopeEntry) => {
    ensure(entry);
    if (!executions.has(entry) && mayChange(entry)) {
      for (const child of transaction.readState(entry).children) {
        if (child.type === 'scope') requireProjection(child);
        else if (child.type !== 'path') ensure(child);
      }
      ensure(entry);
    }
    if (executions.has(entry)) queue.require({ entry, phase: 'project' });
  };
  const namespaceOf = (entry: WeaveEntry) => {
    const owner = names.namespaceOf(entry);
    let identity = namespaces.get(owner);
    if (identity === undefined) {
      identity = Object.freeze({}) as CompileNamespaceKey;
      namespaces.set(owner, identity);
    }
    return identity;
  };
  /** 从父级稳定事实取得环境，只为计算或必要 Scope 输出建立上下文 */
  const contextOf = (parent: WeaveRoot | WeaveScopeEntry): SubtreeCompileContext => {
    if (parent.type === 'root') return rootFrame.context;
    const execution = executions.get(parent);
    if (execution?.scope !== undefined) return execution.scope.childFrame.context;
    const state = transaction.readState(parent);
    const outer = contextOf(state.parent);
    const transforms = state.compile?.context.preparation.preliminaryTransforms;
    return {
      ...outer,
      inheritance: state.resolve!.value.inheritance,
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
  const ownerOf = (entry: WeaveScopeEntry): CompileOwnerKey | undefined => {
    if (tracker === undefined) return;
    let owner = owners.get(entry);
    if (owner === undefined) {
      const state = transaction.readState(entry);
      const parent = state.parent.type === 'root' ? tracker.root : ownerOf(state.parent)!;
      owner = tracker.createOwner(
        { ...state.origin.own, children: [] },
        paths.get(entry)!.at(-1) as number,
        parent,
        false,
        namespaceOf(entry),
      );
      owners.set(entry, owner);
    }
    return owner;
  };
  const scopeFacts = (entry: WeaveScopeEntry) => {
    const scope = executions.get(entry)?.scope;
    const current = transaction.readState(entry);
    return {
      compiled: (scope?.compiled ?? current.compile?.value)!,
      preparation: (scope?.preparation ?? current.compile?.context.preparation)!,
      transforms: (scope?.transforms ?? current.compile?.value.layout.overall.transforms)!,
      context: executions.get(entry)?.frame.context ?? contextOf(current.parent),
    };
  };
  /** ⚡清洁贡献直接物化输出，不进入元素执行器或候选写入 */
  const outputOf = (entry: WeaveEntry): SubtreeCompileState => {
    if (pending.has(keyOf(entry))) queue.require(prepareAddress(entry));
    const execution = executions.get(entry);
    if (execution !== undefined) {
      queue.require(outputAddress(entry));
      for (const primitive of execution.frame.state.primitives) {
        if (primitive.type === 'path-placeholder') continue;
        const zIndex = execution.executor.output.zIndexMap.get(primitive);
        if (zIndex !== undefined) rootExecutor.output.zIndexMap.set(primitive, zIndex);
      }
      return execution.frame.state;
    }
    const cached = assembled.get(entry);
    if (cached !== undefined) return cached;
    const state = transaction.readState(entry);
    if (entry.type !== 'scope') {
      const contribution = state.contribution!;
      for (const warning of contribution.diagnostics)
        if (warning.code !== BuiltinCompileWarningCode.DuplicateNodeId)
          runtime.state.workspace.diagnosticCollector.collect(warning);
      const parent = state.parent.type === 'root' ? tracker?.root : ownerOf(state.parent);
      const owner =
        parent === undefined
          ? undefined
          : tracker?.createOwner(
              state.origin.own as IRChild,
              paths.get(entry)!.at(-1) as number,
              parent,
              false,
              namespaceOf(entry),
            );
      const result = materializeWeaveOutput(runtime, rootExecutor.output, contribution, owner, namespaceOf(entry));
      assembled.set(entry, result);
      return result;
    }
    const scope = transaction.readState(entry);
    const childState = emptyOutput();
    for (const child of scope.children) appendState(childState, outputOf(child));
    const result = emptyOutput();
    importSceneResources(
      scope.compile?.resources ?? { paints: [], clips: [] },
      runtime.state.workspace.paintRegistry,
      runtime.state.workspace.clipRegistry,
    );
    for (const warning of scope.compile?.diagnostics ?? [])
      if (warning.code !== BuiltinCompileWarningCode.DuplicateNodeId)
        runtime.state.workspace.diagnosticCollector.collect(warning);
    let compiled = scope.compile!.value;
    let outputDiagnostics = scope.compile?.outputDiagnostics ?? [];
    if (changedOutputs.has(entry)) {
      const context = contextOf(scope.parent);
      const bound = bindScopeOutputAnimations(scope.resolve!.value, compiled, childState.primitives.length, {
        layouts: childState.geometries,
        positionContext: createTreePositionContext(runtime, context.transformChains),
        irPath: paths.get(entry)!,
        onWarn: runtime.state.workspace.diagnosticCollector.collect,
        registerClip: runtime.state.workspace.clipRegistry.register,
        registerClipPath: runtime.state.workspace.clipRegistry.registerPath,
      });
      if (bound.compiled !== compiled || !compareProperties(outputDiagnostics, bound.diagnostics)) {
        transaction.editState(entry).compile = { ...scope.compile!, value: bound.compiled };
        recordComputed(
          entry,
          { ...scope.compile!, outputDiagnostics: bound.diagnostics, value: bound.compiled },
          bound.compiled === compiled,
          scope.referenceReads,
        );
      }
      compiled = bound.compiled;
      outputDiagnostics = bound.diagnostics;
    }
    for (const warning of outputDiagnostics) runtime.state.workspace.diagnosticCollector.collect(warning);
    assembleWeaveScopeOutput(
      runtime,
      rootExecutor.output,
      scope.origin.own,
      compiled,
      childState,
      { context: contextOf(scope.parent), state: result },
      ownerOf(entry),
    );
    assembled.set(entry, result);
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
  const layoutOf = (entry: WeaveEntry): WeaveContribution['output'] | SubtreeCompileState => {
    if (entry.type !== 'scope') return transaction.readState(entry).contribution!.output;
    const state = transaction.readState(entry);
    const children = emptyOutput();
    for (const child of state.children) {
      if (child.type === 'path') continue;
      ensure(child);
      if (child.type === 'scope') requireProjection(child);
      appendState(children, executions.get(child)?.frame.state ?? layoutOf(child));
    }
    const result = emptyOutput();
    const compiled = state.compile!.value;
    result.geometries.push(
      ...projectScopeCompileLayouts(
        state.origin.own,
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

  /** 贡献携带局部输出，作用域输入变化时交回阶段级 prepared 比较；⚡数值变换链只展开到标量字段 */
  const contextMatches = (entry: WeaveEntry, finalParent = false, inheritance = true): boolean => {
    if (
      inheritance &&
      !compareProperties(entry.current?.origin.context, executions.get(entry)!.frame.context.inheritance, { depth: 2 })
    )
      return false;
    const ancestors = ancestorsOf(entry);
    for (const [index, ancestor] of ancestors.entries()) {
      ensure(ancestor);
      const facts = scopeFacts(ancestor);
      if (
        !compareProperties(
          ancestor.current?.compile?.context.preparation.preliminaryTransforms,
          facts.preparation.preliminaryTransforms,
          { depth: 2 },
        )
      )
        return false;
      if (finalParent && index === 0) {
        requireProjection(ancestor);
        if (
          !compareProperties(
            ancestor.current?.compile?.value.layout.overall.transforms,
            scopeFacts(ancestor).transforms,
            {
              depth: 2,
            },
          )
        )
          return false;
      }
    }
    return true;
  };

  /** 将发布时的初步世界几何投影到消费者当前可见的闭合 Scope */
  const projectBinding = (
    entry: NamespaceEntry,
    producer: WeaveEntry,
    consumer: WeaveEntry,
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

  const lookup = (consumer: WeaveEntry, name: string, closed: boolean): NamespaceEntry | undefined => {
    const binding = names.lookup({ consumer, name, visibility: closed ? 'closed' : 'declaration' }, entry => {
      if (entry === consumer) return executions.get(entry)?.bindings ?? [];
      ensure(entry);
      if (executions.has(entry) && !executions.get(entry)!.bindingsReady) queue.require(prepareAddress(entry));
      return executions.get(entry)?.bindings ?? entry.current?.contribution?.bindings ?? [];
    });
    if (binding === undefined) return;
    const producer = binding.entry;
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

  const initialize = (entry: WeaveEntry): WeaveElementExecution => {
    const existing = executions.get(entry);
    if (existing !== undefined) return existing;
    const parent = transaction.readState(entry).parent;
    if (parent.type !== 'root' && pending.has(keyOf(parent))) queue.require(prepareAddress(parent));
    const parentContext = contextOf(parent);
    const state = transaction.editState(entry);
    state.origin = { ...state.origin, context: parentContext.inheritance };
    const namespaceOwner = names.namespaceOf(entry);
    let identity = namespaces.get(namespaceOwner);
    if (identity === undefined) {
      identity = Object.freeze({}) as CompileNamespaceKey;
      namespaces.set(namespaceOwner, identity);
    }
    const namespace: NamespaceStack = new NamespaceStack(
      {
        rootIdentity: identity,
        lookupExternal: name => lookup(entry, name, namespace.isResolving && namespace.scopeDepth === 0),
        onDuplicate: info => {
          if (info.frameDepth === 0) return;
          const outerDepth = ancestorsOf(entry).filter(
            scope => transaction.readState(scope).origin.own.localNamespace,
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
    if (entry.type === 'path' && parent.type !== 'root') {
      requireProjection(parent);
      const facts = scopeFacts(parent);
      chains = composer.append(facts.context.transformChains, facts.transforms);
    }
    const frame = { context: { ...parentContext, transformChains: chains }, state: executor.createRootRuntime().state };
    const execution = { runtime: candidate, executor, frame, bindings: [] };
    executions.set(entry, execution);
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
  const executeComposite = (entry: Extract<WeaveEntry, { type: 'composite' }>, execution: WeaveElementExecution) => {
    const state = transaction.readState(entry);
    const path = paths.get(entry)!;
    const reads: Array<WeaveReferenceRead> = [];
    execution.reads = reads;
    execution.retained = undefined;
    const namespace = execution.runtime.state.execution.namespaceStack;
    execution.bindings = namespace.captureFrameChanges(() =>
      namespace.observeReferences(
        (name, referenceEntry, kind) => reads.push({ name, entry: referenceEntry, kind, readiness: 'prepare' }),
        () =>
          namespace.withProducer(entry, () => {
            execution.semanticOwner = execution.executor.compileChild(
              state.origin.own,
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
      const entry = task.entry;
      const path = paths.get(entry)!;
      const index = path.at(-1) as number;
      if (task.phase === 'output') {
        queue.require(prepareAddress(entry));
        const execution = executions.get(entry)!;
        if (entry.type === 'composite') {
          if (execution.retained !== undefined) {
            const retainedContribution = execution.retained;
            const outputReads = transaction
              .readState(entry)
              .referenceReads.filter(read => read.readiness === 'output' && read.entry?.producer !== entry);
            const valid =
              contextMatches(entry, true) &&
              matchWeaveReferences(outputReads, { lookupReference: name => lookup(entry, name, true) });
            for (const field of Object.values(execution.frame.state)) field.length = 0;
            if (valid) {
              const state = transaction.readState(entry);
              const parent = execution.frame.context.compileOwner;
              execution.semanticOwner =
                parent === undefined
                  ? undefined
                  : tracker?.createOwner(state.origin.own, index, parent, false, namespaceOf(entry));
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
              executeComposite(entry, execution);
            }
          }
          const parent = transaction.readState(entry).parent;
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
        if (entry.type === 'scope') {
          requireProjection(entry);
          const steps = execution.scope!;
          // 包络已完成；此后只替换输出收集，不改变其布局事实
          steps.childFrame.state.primitives.length = 0;
          steps.childFrame.state.bounds.length = 0;
          steps.childFrame.state.allocations.length = 0;
          steps.childFrame.state.alignmentGuides.length = 0;
          for (const child of transaction.readState(entry).children) {
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
          const state = transaction.editState(entry);
          state.resolve = result.resolve;
          state.compile = { ...result.compile, value: steps.compiled, outputDiagnostics };
          recordComputed(
            entry,
            { ...result.compile, outputDiagnostics, value: steps.compiled },
            result.reused,
            result.referenceReads,
          );
        }
        if (entry.type === 'path' && execution.retained === undefined) {
          const namespace = execution.runtime.state.execution.namespaceStack;
          namespace.setPhase('resolving');
          try {
            const state = transaction.readState(entry);
            const pendingPath = execution.frame.state.paths[0];
            execution.runtime.state.execution.withWarningOccurrence(pendingPath.occurrence, () =>
              namespace.withProducer(entry, () => {
                const result = executeWeavePath(execution.runtime, pendingPath, canReuse(entry) ? state : undefined);
                const target = transaction.editState(entry);
                target.resolve = result.resolve;
                target.compile = result.compile;
                recordComputed(entry, result.compile, result.reused, result.referenceReads);
                assemblePaths(execution.runtime, execution.executor.output, [pendingPath], [result.compile.value]);
              }),
            );
            execution.frame.state.paths.length = 0;
          } finally {
            namespace.setPhase('registering');
          }
        }
        if (entry.type === 'composite' && execution.reads !== undefined) {
          const reads = execution.reads;
          execution.runtime.state.execution.namespaceStack.observeReferences(
            (name, referenceEntry, kind) => reads.push({ name, entry: referenceEntry, kind, readiness: 'output' }),
            () => execution.executor.finish(execution.frame.state),
          );
        } else execution.executor.finish(execution.frame.state);
        if (entry.type !== 'scope' && execution.retained === undefined) {
          writeContribution(
            entry,
            captureWeaveContribution(
              execution.runtime,
              execution.executor.output,
              execution.frame.state,
              execution.bindings,
              { sourcePath: path, expansionPath: [] },
              execution.semanticOwner,
            ),
            execution.reads ?? transaction.readState(entry).referenceReads,
          );
        }
        consume(entry);
        return;
      }
      if (entry.type === 'scope' && task.phase === 'project') {
        queue.require(prepareAddress(entry));
        const execution = executions.get(entry)!;
        const steps = execution.scope!;
        for (const child of transaction.readState(entry).children) {
          if (child.type === 'path') continue;
          if (child.type === 'scope') requireProjection(child);
          else ensure(child);
          if (executions.has(child)) append(steps.childFrame.state, executions.get(child)!, execution.executor.output);
          else appendState(steps.childFrame.state, layoutOf(child));
        }
        const state = transaction.readState(entry);
        const result = executeWeaveScope(
          execution.runtime,
          state.origin.own,
          execution.frame.context,
          steps,
          execution.scopeDiagnostics ?? [],
          execution.scopeReads ?? [],
          canReuse(entry) ? state : undefined,
        );
        execution.scopeResult = result;
        steps.project(result.compile.value);
        return;
      }
      ensureDependencies(entry);
      const execution = initialize(entry);
      const { executor, frame } = execution;
      const state = transaction.readState(entry);
      if (entry.type === 'scope') {
        const own = transaction.readState(entry).origin.own;
        const owner = ownerOf(entry);
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
          own,
          path,
          scopeFrame.context,
          canReuse(entry) ? transaction.readState(entry) : undefined,
        );
        const scopeReads: Array<WeaveReferenceRead> = [];
        execution.scopeReads = scopeReads;
        execution.scope = execution.runtime.state.execution.namespaceStack.observeReferences(
          (name, referenceEntry, kind) => scopeReads.push({ name, entry: referenceEntry, kind, readiness: 'prepare' }),
          () =>
            prepareScopeExecution(
              execution.runtime,
              executor.output,
              {
                compileChildren: () => {
                  throw createExecutionInvariantError('Authored Scope cannot traverse children during update');
                },
              },
              { ...own, children: [] },
              index,
              scopeFrame,
              { semanticOwner: owner, resolvedScope: canon },
            ),
        );
        execution.scopeDiagnostics = runtime.state.workspace.diagnosticCollector.warnings.slice(warningCount);
        if (
          !contextMatches(entry, false, false) ||
          !compareProperties(
            entry.current?.resolve?.value.inheritance,
            execution.scope.childFrame.context.inheritance,
            {
              depth: 2,
            },
          ) ||
          !compareProperties(
            entry.current?.compile?.context.preparation.preliminaryTransforms,
            execution.scope.preparation.preliminaryTransforms,
            { depth: 2 },
          )
        ) {
          for (const child of transaction.readState(entry).children) notify(child);
        }
        return;
      }
      let contribution = retained.get(keyOf(entry)) ?? pending.get(keyOf(entry))?.check;
      const namespace = execution.runtime.state.execution.namespaceStack;
      if (contribution !== undefined && !contextMatches(entry, entry.type === 'path')) contribution = undefined;
      if (contribution !== undefined) {
        const prepareReads = transaction
          .readState(entry)
          .referenceReads.filter(read => read.readiness === 'prepare' && read.entry?.producer !== entry);
        if (matchWeaveReferences(prepareReads, namespace)) {
          execution.bindings = contribution.bindings;
          execution.bindingsReady = true;
          if (entry.type === 'composite') {
            execution.retained = contribution;
            // 包络只消费准备阶段的局部几何，未核对的旧绘制不进入最终输出
            frame.state.geometries.push(...contribution.output.geometries);
            frame.state.publications.push(...contribution.output.publications);
            frame.state.primitives.push(...contribution.output.primitives);
            frame.state.artifacts.push(...contribution.output.artifacts);
            return;
          }
          const outputReads = transaction
            .readState(entry)
            .referenceReads.filter(read => read.readiness === 'output' && read.entry?.producer !== entry);
          if (!matchWeaveReferences(outputReads, { lookupReference: name => lookup(entry, name, true) }))
            contribution = undefined;
        } else contribution = undefined;
      }
      if (entry.type === 'composite') {
        executeComposite(entry, execution);
      } else {
        const occurrence = { sourcePath: path, expansionPath: [] };
        execution.semanticOwner =
          frame.context.compileOwner === undefined
            ? undefined
            : tracker?.createOwner(
                state.origin.own as IRChild,
                index,
                frame.context.compileOwner,
                false,
                namespace.identity,
              );
        execution.bindings = namespace.captureFrameChanges(() =>
          namespace.withProducer(entry, () =>
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
              if (entry.type === 'coordinate') {
                const own = transaction.readState(entry).origin.own;
                const result = executeWeaveCoordinate(
                  execution.runtime,
                  own,
                  frame.context,
                  canReuse(entry) ? transaction.readState(entry) : undefined,
                );
                const target = transaction.editState(entry);
                target.resolve = result.resolve;
                target.compile = result.compile;
                recordComputed(entry, result.compile, result.reused, result.referenceReads);
                assembleCoordinate(execution.runtime, own, index, frame, result.compile.value);
              } else if (entry.type === 'node') {
                const own = transaction.readState(entry).origin.own;
                const result = executeWeaveNode(
                  execution.runtime,
                  own,
                  path,
                  frame.context,
                  canReuse(entry) ? transaction.readState(entry) : undefined,
                );
                const target = transaction.editState(entry);
                target.resolve = result.resolve;
                target.compile = result.compile;
                recordComputed(entry, result.compile, result.reused, result.referenceReads);
                assembleNode(
                  execution.runtime,
                  executor.output,
                  own,
                  path,
                  frame,
                  result.compile.value,
                  execution.semanticOwner,
                );
              } else {
                queuePathChild(
                  execution.runtime,
                  executor.output,
                  transaction.readState(entry).origin.own,
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
        const entry = task.entry;
        const previousCount = (element: WeaveEntry): number => {
          if (element.type !== 'scope') return element.current?.contribution?.output.primitives.length ?? 0;
          const state = element.current;
          if (state?.compile === undefined) return 0;
          return shouldEmitScopeGroup(
            state.children.some(child => previousCount(child) > 0) ? 1 : 0,
            state.compile.value.layout.overall.transforms,
            state.compile.value.emit.overall.id,
            state.compile.value.emit.overall.clipRef !== undefined,
          )
            ? 1
            : 0;
        };
        if (previousCount(entry) !== executions.get(entry)!.frame.state.primitives.length)
          for (const parent of ancestorsOf(entry)) {
            changedOutputs.add(parent);
            assembled.delete(parent);
          }
        return;
      }
      const producer = task.entry;
      const state = transaction.readState(producer);
      const previousBindings = producer.current?.contribution?.bindings ?? [];
      const bindings = executions.get(producer)?.bindings ?? [];
      // 先比较生产者实际输出通道；只通知直接消费者，由其按查询及 prepared 槽位继续核对
      for (const consumer of state.consumers) {
        const kinds = transaction.readState(consumer).dependencies.get(producer) ?? [];
        const changed =
          producer.type === 'scope'
            ? task.phase === 'project' &&
              !jsonStructuralEquals(
                producer.current?.compile?.value.layout.overall,
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
        !compareProperties(
          producer.current?.compile?.value.layout.overall.transforms,
          executions.get(producer)!.scope!.transforms,
          { depth: 2 },
        )
      ) {
        // 后代局部几何可以复用，世界投影变化只通知其实际消费者
        for (const entry of descendants(producer)) {
          if (entry.type === 'path' || entry.type === 'composite') notify(entry);
          for (const consumer of transaction.readState(entry).consumers)
            if (!ancestorsOf(consumer).includes(producer)) notify(consumer);
        }
      }
    },
  );

  for (const { entry } of pending.values()) {
    queue.request(prepareAddress(entry));
    queue.request(outputAddress(entry));
  }
  queue.flush();
  for (const entry of executions.keys()) queue.require(outputAddress(entry));
  queue.flush();
  const diagnosticNamespace = new NamespaceStack({
    rootIdentity: runtime.state.execution.namespaceStack.identity,
    onDuplicate: info => runtime.state.workspace.diagnosticCollector.collect(createDuplicateWarning(info)),
  });
  const collectDeclarations = (container: WeaveRoot | WeaveScopeEntry) => {
    for (const entry of transaction.readState(container).children) {
      if (entry.type === 'scope') {
        const own = transaction.readState(entry).origin.own;
        if (own.id !== undefined)
          diagnosticNamespace.register(own.id, {
            geometry: { position: [0, 0] },
            irPath: [...paths.get(entry)!, 'id'],
          });
        if (own.localNamespace) diagnosticNamespace.pushFrame();
        collectDeclarations(entry);
        if (own.localNamespace) diagnosticNamespace.popFrame();
      } else
        for (const binding of executions.get(entry)?.bindings ?? entry.current?.contribution?.bindings ?? [])
          diagnosticNamespace.commitForkChange(binding);
    }
  };
  collectDeclarations(root);
  for (const entry of transaction.readState(root).children) appendState(rootFrame.state, outputOf(entry));
  if (pending.size !== 0) throw createExecutionInvariantError('Weave computations did not reach output readiness');
  return finalizeSceneCompilation<TComposite>(source, runtime, rootExecutor.finish(rootFrame.state));
};
