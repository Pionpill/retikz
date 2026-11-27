import {
  projectLayoutWithTransform,
  projectPublishedReference,
  registerFatalProbeError,
  RetikzCoreError,
  RetikzCoreErrorCode,
  selectCompositeInputScope,
} from '@retikz/core';
import type { IdAllocator, PropertyPath } from '@retikz/foundation';
import { compareProperties } from '@retikz/foundation';

import type {
  CompileNamespaceKey,
  CompileOwnerKey,
  CompileRuntime,
  NamespaceEntry,
  SubtreeCompileContext,
  SubtreeCompileRuntime,
} from '../../compile';
import {
  needsScopeEnvelope,
  assembleCompileSubtree,
  CompileElementExecutor,
  createDuplicateWarning,
  NamespaceStack,
} from '../../compile';
import type { WeaveEntry, WeaveRoot, WeaveScopeEntry } from '../shared';
import type { WeaveNameIndex, WeaveTransaction } from '../state';
import type { WeaveTaskAddress } from './task';
import type { WeaveElementExecution, WeaveUpdateRequest } from './types';

/** 本批绑定查询所需的事务、执行状态及依赖调度能力 */
type WeaveBindingFlowContext = {
  runtime: CompileRuntime;
  transaction: WeaveTransaction;
  paths: ReadonlyMap<WeaveEntry, PropertyPath>;
  names: WeaveNameIndex;
  executions: Map<WeaveEntry, WeaveElementExecution>;
  namespaces: Map<WeaveRoot | WeaveScopeEntry, CompileNamespaceKey>;
  owners: Map<WeaveScopeEntry, CompileOwnerKey>;
  rootFrame: SubtreeCompileRuntime;
  ancestorsOf: (entry: WeaveEntry) => Array<WeaveScopeEntry>;
  ensure: (entry: WeaveEntry) => void;
  requireProjection: (entry: WeaveScopeEntry) => void;
  requireTask: (address: WeaveTaskAddress) => void;
  prepareAddress: (entry: WeaveEntry) => WeaveTaskAddress;
  pending: Map<WeaveEntry, WeaveUpdateRequest>;
  scopeIds: IdAllocator;
};

/** 本批声明命名空间、继承上下文与几何引用查询 */
export const createWeaveBindingFlow = ({
  runtime,
  transaction,
  paths,
  names,
  executions,
  namespaces,
  owners,
  rootFrame,
  ancestorsOf,
  ensure,
  requireProjection,
  requireTask,
  prepareAddress,
  pending,
  scopeIds,
}: WeaveBindingFlowContext) => {
  const composer = runtime.state.execution.scopeTransformComposer;
  const tracker = runtime.state.execution.provenanceTracker;
  /** ⚡仅在真实读取点反查尚可能变化的上游，不预遍历消费者闭包 */
  const namespaceOf = (entry: WeaveEntry): CompileNamespaceKey => {
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
      skipGeometries:
        outer.skipGeometries === true && !needsScopeEnvelope(state.origin.own, state.compile!.context.preparation),
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

  // ⚡只跳过本批已重新编译且未发布名称的连续实例；保留的贡献在 output 阶段仍可能重新编译
  const previousCandidates = new Map<number, number>();
  const previousCandidate = (index: number, entry: WeaveEntry) => {
    const previous = previousCandidates.get(index);
    if (previous !== undefined) return previous;
    const execution = executions.get(entry);
    if (!execution?.bindingsReady || execution.retained !== undefined || execution.bindings.length !== 0) return index;
    const candidate = previousCandidates.get(index - 1) ?? index - 1;
    previousCandidates.set(index, candidate);
    return candidate;
  };
  const lookup = (consumer: WeaveEntry, name: string, closed: boolean): NamespaceEntry | undefined => {
    const binding = names.lookup(
      { consumer, name, visibility: closed ? 'closed' : 'declaration' },
      entry => {
        if (entry === consumer) return executions.get(entry)?.bindings ?? [];
        ensure(entry);
        if (executions.has(entry) && !executions.get(entry)!.bindingsReady) requireTask(prepareAddress(entry));
        return executions.get(entry)?.bindings ?? entry.current?.contribution?.bindings ?? [];
      },
      false,
      previousCandidate,
    );
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
    if (executions.has(producer) && !executions.get(producer)!.bindingsReady) requireTask(prepareAddress(producer));
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
    if (parent.type !== 'root' && pending.has(parent)) requireTask(prepareAddress(parent));
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
    const frame = {
      context: {
        ...parentContext,
        transformChains: chains,
        skipGeometries: entry.type === 'scope' && parentContext.skipGeometries,
      },
      state: executor.createRootRuntime().state,
    };
    const execution = { runtime: candidate, executor, frame, bindings: [] };
    executions.set(entry, execution);
    return execution;
  };

  return { namespaceOf, contextOf, ownerOf, scopeFacts, contextMatches, lookup, initialize };
};
