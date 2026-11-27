import type { AnyCompositeDefinition, IRChild } from '@retikz/core';
import { projectPublishedReference } from '@retikz/core';
import { createIdAllocator } from '@retikz/foundation';

import {
  assembleCompileSubtree,
  assembleCoordinate,
  assembleNode,
  assemblePaths,
  CompileElementExecutor,
  createExecutionInvariantError,
  finalizeSceneCompilation,
  queuePathChild,
} from '../../compile';
import type { CompileNamespaceKey, CompileOwnerKey } from '../../compile';
import { captureWeaveContribution, materializeWeaveContribution, materializeWeaveOutput } from '../contribution';
import { executeWeaveCoordinate, executeWeaveNode, executeWeavePath } from '../element';
import type { WeaveEntry, WeaveReferenceRead, WeaveRoot, WeaveScopeEntry } from '../shared';
import { matchWeaveReferences } from '../shared';
import { createWeaveBindingFlow } from './binding';
import { createWeaveDependencyFlow } from './dependency';
import { createCompositeElementDispatcher, createWeaveCompositeStage } from './dispatcher';
import { appendWeaveOutput, createWeaveOutputFlow } from './output';
import { WeaveTaskQueue } from './queue';
import { collectWeaveRootBlocks } from './root-output';
import { prepareScheduledScope, projectScheduledScope, publishScheduledScope } from './scope';
import type { WeaveTaskAddress } from './task';
import type {
  WeaveAssembledOutput,
  WeaveElementExecution,
  WeaveExecutionContext,
  WeaveExecutionSelection,
} from './types';

/** 执行已选择的候选任务，首屏与更新共用条目计算和组装 */
export const executeWeaveCompilation = <TComposite extends AnyCompositeDefinition>(
  executionContext: WeaveExecutionContext,
  selection: WeaveExecutionSelection,
) => {
  const { source, runtime, recordComputed, writeContribution, root, transaction, paths, names } = executionContext;
  const { canReuse, retained, pending } = selection;
  const executions = new Map<WeaveEntry, WeaveElementExecution>();
  const namespaces = new Map<WeaveRoot | WeaveScopeEntry, CompileNamespaceKey>();
  const owners = new Map<WeaveScopeEntry, CompileOwnerKey>();
  const scopeIds = createIdAllocator('compile/scope');
  const composer = runtime.state.execution.scopeTransformComposer;
  const tracker = runtime.state.execution.provenanceTracker;
  namespaces.set(root, runtime.state.execution.namespaceStack.identity);
  const rootExecutor = new CompileElementExecutor(source.children, runtime, {
    compileSubtree: assembleCompileSubtree,
    // ⚡Scene 根输出不消费父布局占位，跳过逐层传播；独立 Composite 测量仍按需开启
    skipAllocation: true,
    skipRootGeometries: true,
  });
  const initialFrame = rootExecutor.createRootRuntime();
  const rootFrame = { ...initialFrame, context: { ...initialFrame.context, compositeInput: undefined } };

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
  const consume = (entry: WeaveEntry) => {
    pending.get(entry)?.consume();
    pending.delete(entry);
  };
  const assembled = new Map<WeaveEntry, WeaveAssembledOutput>();
  /** 子输出可见性变化只更新祖先分组输出，不失效子布局 */
  const changedOutputs = new Set<WeaveScopeEntry>();
  const { ancestorsOf, notify, ensureDependencies, ensure, requireProjection, notifyConsumers } =
    createWeaveDependencyFlow({
      root,
      transaction,
      pending,
      executions,
      assembled,
      changedOutputs,
      prepareAddress,
      outputAddress,
      requestTask: address => queue.request(address),
      requireTask: address => queue.require(address),
    });
  const { namespaceOf, contextOf, ownerOf, scopeFacts, contextMatches, lookup, initialize } = createWeaveBindingFlow({
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
    requireTask: address => queue.require(address),
    prepareAddress,
    pending,
    scopeIds,
  });
  const { outputOf, layoutOf, append, collectDeclarationsIfChanged } = createWeaveOutputFlow({
    runtime,
    transaction,
    paths,
    pending,
    executions,
    assembled,
    changedOutputs,
    rootExecutor,
    recordComputed,
    prepareAddress,
    outputAddress,
    requireTask: address => queue.require(address),
    contextOf,
    ownerOf,
    namespaceOf,
    ensure,
    requireProjection,
  });
  /** 计算作者 Composite，并将本次读取事实留在候选工作区 */
  const executeComposite = (entry: Extract<WeaveEntry, { type: 'composite' }>, execution: WeaveElementExecution) => {
    const state = transaction.readState(entry);
    const path = paths.get(entry)!;
    const previous = entry.current;
    const compatible =
      canReuse(entry) &&
      previous?.origin.own.namespace === state.origin.own.namespace &&
      previous.origin.own.type === state.origin.own.type;
    const candidate = transaction.editState(entry);
    candidate.memo = compatible ? previous.memo : undefined;
    // 仅从兼容实例的已提交阶段读取旧记录；本轮记录写入候选状态，回滚不影响旧记录
    const current = compatible ? previous.stage : undefined;
    const next = createWeaveCompositeStage();
    candidate.stage = next;
    execution.executor.output.compositeDispatcher = createCompositeElementDispatcher(current, next);
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
              undefined,
              undefined,
              { source: state.origin.own, sourcePath: path, bindings: state.bindings ?? [] },
              candidate,
            );
          }),
      ),
    );
  };

  const queue = new WeaveTaskQueue(task => {
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
            appendWeaveOutput(
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
        publishScheduledScope(entry, execution, executionContext, rootExecutor, outputOf);
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
      } else if (entry.type !== 'node' || execution.frame.state.primitives.length > 1) {
        // ⚡Node 不排队延迟路径；至多一个图元无需排序，贡献捕获直接使用已组装的状态
        execution.executor.finish(execution.frame.state);
      }
      if (entry.type !== 'scope' && execution.retained === undefined) {
        writeContribution(
          entry,
          captureWeaveContribution(
            execution.runtime,
            execution.executor.output,
            execution.frame.state,
            execution.bindings,
            entry.type === 'composite'
              ? {
                  paints: runtime.state.workspace.paintRegistry.getResources(),
                  clips: runtime.state.workspace.clipRegistry.getResources(),
                }
              : transaction.readState(entry).compile!.resources,
            { sourcePath: path, expansionPath: [] },
            entry.type !== 'composite',
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
        const includeLayouts = !steps.childFrame.context.skipGeometries;
        if (executions.has(child))
          append(steps.childFrame.state, executions.get(child)!, execution.executor.output, includeLayouts);
        else appendWeaveOutput(steps.childFrame.state, layoutOf(child, includeLayouts), includeLayouts);
      }
      projectScheduledScope(entry, execution, transaction, canReuse);
      return;
    }
    ensureDependencies(entry);
    const execution = initialize(entry);
    const { executor, frame } = execution;
    const state = transaction.readState(entry);
    if (entry.type === 'scope') {
      if (prepareScheduledScope(entry, execution, executionContext, ownerOf, canReuse, contextMatches)) {
        for (const child of transaction.readState(entry).children) notify(child);
      }
      return;
    }
    let contribution = retained.get(entry) ?? pending.get(entry)?.check;
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
              appendWeaveOutput(
                frame.state,
                materializeWeaveContribution(execution.runtime, executor.output, contribution, execution.semanticOwner),
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
  }, notifyConsumers);

  for (const entry of pending.keys()) {
    queue.request(prepareAddress(entry));
    queue.request(outputAddress(entry));
  }
  queue.flush();
  for (const entry of executions.keys()) queue.require(outputAddress(entry));
  queue.flush();
  collectDeclarationsIfChanged(root, executionContext.indexesChanged);
  const blocks = collectWeaveRootBlocks(executionContext, executions.keys(), rootFrame.state, entry =>
    appendWeaveOutput(rootFrame.state, outputOf(entry)),
  );
  if (pending.size !== 0) throw createExecutionInvariantError('Weave computations did not reach output readiness');
  return finalizeSceneCompilation<TComposite>(source, runtime, blocks ?? rootExecutor.finishDrawing(rootFrame.state));
};
