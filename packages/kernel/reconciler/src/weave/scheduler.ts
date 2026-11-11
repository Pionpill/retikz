import type { AnyCompositeDefinition, IRScene, IRChild } from '@retikz/core';
import {
  projectLayoutWithTransform,
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
} from '../compile/execution';
import type {
  CompileContribution,
  SubtreeCompileRuntime,
  SubtreeCompileState,
  ScopeExecutionSteps,
} from '../compile/execution';
import type { CompileNamespaceKey, CompileOwnerKey } from '../compile/provenance';
import type { CompileRuntime, NamespaceFrameChange, NamespaceEntry } from '../compile/runtime';
import { NamespaceStack, createExecutionInvariantError } from '../compile/runtime';
import { createDuplicateWarning } from '../compile/shared';
import { createWeaveStageController } from './cache';
import type { CompileStageCache } from './cache';
import { WeaveTaskQueue } from './schedule';
import type { WeaveTaskAddress } from './schedule';
import type { WeaveNode, WeaveRoot, WeaveScopeNode } from './shared';
import { compareReferenceGeometry, matchWeaveReferences } from './shared';
import { WeaveNameIndex } from './state';
import type { WeaveTransaction } from './state';

/** 候选直接变化与完成确认；依赖在读取点核对实际结果 */
export type WeaveUpdateRequest = {
  /** 自身输入未变时可以核对的旧贡献 */
  check?: CompileContribution;
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
  bindings: Array<NamespaceFrameChange>;
  /** 准备读取已证实有效，可供延迟输出的反向依赖读取 */
  bindingsReady?: boolean;
  /** 只确认准备读取的 Composite 旧结果，输出读取在输出边界核对 */
  retained?: CompileContribution;
  scope?: ScopeExecutionSteps;
};

/** 从稳定候选事实按需建立环境，读取点完成生产者，最后只聚合完成的输出 */
export const executeWeaveUpdate = <TComposite extends AnyCompositeDefinition>(
  source: IRScene,
  runtime: CompileRuntime,
  cache: CompileStageCache,
  retained: ReadonlyMap<string, CompileContribution>,
  pending: Map<string, WeaveUpdateRequest>,
  root: WeaveRoot,
  transaction: WeaveTransaction,
  paths: ReadonlyMap<WeaveNode, PropertyPath>,
) => {
  const keyOf = (node: WeaveNode) => JSON.stringify(paths.get(node));
  const names = new WeaveNameIndex(transaction, paths);
  const controller = createWeaveStageController(cache.read, cache.write);
  const executions = new Map<WeaveNode, WeaveElementExecution>();
  const namespaces = new Map<WeaveRoot | WeaveScopeNode, CompileNamespaceKey>();
  const owners = new Map<WeaveScopeNode, CompileOwnerKey>();
  const scopeIds = createIdAllocator('compile/scope');
  const composer = runtime.state.execution.scopeTransformComposer;
  const tracker = runtime.state.execution.provenanceTracker;
  namespaces.set(root, runtime.state.execution.namespaceStack.identity);
  const rootExecutor = new CompileElementExecutor(source.children, runtime, { compileSubtree: assembleCompileSubtree });
  const rootFrame = rootExecutor.createRootFrame();

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
  const requireProjection = (node: WeaveScopeNode) => queue.require({ node, phase: 'project' });

  /** 贡献携带局部输出，作用域输入变化时交回阶段级 prepared 比较 */
  const contextMatches = (node: WeaveNode, finalParent = false): boolean => {
    if (!compareProperties(node.current?.input.context, executions.get(node)!.frame.context.inheritance, { depth: 2 }))
      return false;
    const ancestors = ancestorsOf(node);
    for (const [index, ancestor] of ancestors.entries()) {
      queue.require(prepareAddress(ancestor));
      const execution = executions.get(ancestor)!;
      if (
        !jsonStructuralEquals(
          ancestor.current?.cache?.scopePreparation?.preliminaryTransforms,
          execution.scope!.preparation.preliminaryTransforms,
        )
      )
        return false;
      if (finalParent && index === 0) {
        requireProjection(ancestor);
        if (!jsonStructuralEquals(ancestor.current?.compiled?.layout.overall.transforms, execution.scope!.transforms))
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
      const execution = executions.get(scope)!;
      const steps = execution.scope!;
      const preliminary = steps.preparation.preliminaryTransforms;
      const post =
        preliminary === undefined
          ? steps.transforms
          : steps.transforms.slice(0, steps.transforms.length - preliminary.length);
      geometry = projectPublishedReference(geometry, execution.frame.context.transformChains, post);
    }
    return { ...entry, geometry };
  };

  const lookup = (consumer: WeaveNode, name: string, closed: boolean): NamespaceEntry | undefined => {
    const binding = names.lookup({ consumer, name, visibility: closed ? 'closed' : 'declaration' }, node => {
      if (node === consumer) return executions.get(node)?.bindings ?? [];
      if (!executions.get(node)?.bindingsReady) queue.require(prepareAddress(node));
      return executions.get(node)!.bindings;
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
      const execution = executions.get(producer)!;
      const compiled = execution.scope!.compiled;
      const intrinsic = {
        shape: compiled.shape,
        boundary: compiled.boundary,
        geometry: compiled.layout.overall.geometry,
      };
      const geometry = projectLayoutWithTransform(
        intrinsic,
        composer.resolve(composer.append(execution.frame.context.transformChains, compiled.layout.overall.transforms)),
      );
      return projectBinding(
        { producer, state: 'resolved', scopeId: producer.scopeId, irPath: binding.path, geometry },
        producer,
        consumer,
        closed,
      );
    }
    if (!executions.get(producer)?.bindingsReady) queue.require(prepareAddress(producer));
    const published = binding.generated ?? executions.get(producer)!.bindings.find(change => change.id === name);
    return published === undefined ? undefined : projectBinding(published.entry, producer, consumer, closed);
  };

  const initialize = (node: WeaveNode): WeaveElementExecution => {
    const existing = executions.get(node);
    if (existing !== undefined) return existing;
    const parent = transaction.readNode(node).parent;
    if (parent.type !== 'root') queue.require(prepareAddress(parent));
    const parentContext =
      parent.type === 'root' ? rootFrame.context : executions.get(parent)!.scope!.childFrame.context;
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
      stages: controller,
      state: { ...runtime.state, execution: { ...runtime.state.execution, namespaceStack: namespace } },
    };
    const executor = new CompileElementExecutor([], candidate, { compileSubtree: assembleCompileSubtree });
    let chains = parentContext.transformChains;
    if (node.type === 'path' && parent.type !== 'root') {
      requireProjection(parent);
      const parentExecution = executions.get(parent)!;
      chains = composer.append(parentExecution.frame.context.transformChains, parentExecution.scope!.transforms);
    }
    const frame = { context: { ...parentContext, transformChains: chains }, state: executor.createRootFrame().state };
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
      const zIndex = execution.executor.output.zIndexOf.get(primitive);
      if (zIndex !== undefined) output.zIndexOf.set(primitive, zIndex);
    }
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
            const state = transaction.readNode(node);
            execution.bindings = execution.runtime.state.execution.namespaceStack.captureFrameChanges(() =>
              execution.executor.executeChild(
                state.input.own,
                index,
                execution.frame,
                state.parent.type === 'root',
                undefined,
                0,
                valid ? retainedContribution : undefined,
              ),
            );
          }
          const parent = transaction.readNode(node).parent;
          if (parent.type !== 'root') {
            requireProjection(parent);
            const parentExecution = executions.get(parent)!;
            const steps = parentExecution.scope!;
            const preliminary = steps.preparation.preliminaryTransforms;
            const post =
              preliminary === undefined
                ? steps.transforms
                : steps.transforms.slice(0, steps.transforms.length - preliminary.length);
            for (const geometry of execution.frame.state.publications) {
              const projected = projectPublishedReference(
                geometry,
                parentExecution.frame.context.transformChains,
                post,
              );
              execution.runtime.state.execution.namespaceStack.replacePublishedGeometry(geometry, projected);
            }
            for (const deferred of execution.frame.state.paths)
              deferred.scopeChain = composer.insert(
                deferred.scopeChain,
                parentExecution.frame.context.transformChains.length,
                post,
              );
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
            queue.require(outputAddress(child));
            const childExecution = executions.get(child)!;
            const childState = childExecution.frame.state;
            steps.childFrame.state.primitives.push(...childState.primitives);
            steps.childFrame.state.bounds.push(...childState.bounds);
            steps.childFrame.state.allocations.push(...childState.allocations);
            steps.childFrame.state.alignmentGuides.push(...childState.alignmentGuides);
            for (const primitive of childState.primitives) {
              if (primitive.type === 'path-placeholder') continue;
              const zIndex = childExecution.executor.output.zIndexOf.get(primitive);
              if (zIndex !== undefined) execution.executor.output.zIndexOf.set(primitive, zIndex);
            }
          }
          steps.paths();
          steps.dispose();
          steps.publish();
        }
        execution.executor.finish(execution.frame.state);
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
          else queue.require(prepareAddress(child));
          append(steps.childFrame.state, executions.get(child)!, execution.executor.output);
        }
        steps.envelope();
        steps.project();
        return;
      }
      const execution = initialize(node);
      const { executor, frame } = execution;
      const state = transaction.readNode(node);
      if (node.type === 'scope') {
        const own = transaction.readNode(node).input.own;
        const parent = state.parent;
        const parentOwner = parent.type === 'root' ? tracker?.root : owners.get(parent);
        const owner =
          parentOwner === undefined
            ? undefined
            : tracker?.createOwner(
                { ...own, children: [] },
                index,
                parentOwner,
                false,
                execution.runtime.state.execution.namespaceStack.identity,
              );
        if (owner !== undefined) owners.set(node, owner);
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
        execution.scope = prepareScopeExecution(
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
        );
        return;
      }
      let contribution = retained.get(keyOf(node)) ?? pending.get(keyOf(node))?.check;
      const namespace = execution.runtime.state.execution.namespaceStack;
      if (contribution !== undefined && !contextMatches(node, node.type === 'path')) contribution = undefined;
      if (contribution !== undefined) {
        const prepareReads = contribution.reads.filter(
          read => read.readiness !== 'output' && read.entry?.producer !== node,
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
      execution.bindings = namespace.captureFrameChanges(() =>
        executor.executeChild(
          state.input.own as IRChild,
          index,
          frame,
          state.parent.type === 'root',
          undefined,
          0,
          contribution,
        ),
      );
      execution.bindingsReady = true;
    },
    task => {
      if (task.phase === 'output') return;
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
        if (changed) queue.request(prepareAddress(consumer));
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
        for (const node of paths.keys()) {
          if (!ancestorsOf(node).includes(producer)) continue;
          for (const consumer of transaction.readNode(node).consumers) queue.request(prepareAddress(consumer));
        }
      }
    },
  );

  for (const node of paths.keys()) if (pending.has(keyOf(node))) queue.request(prepareAddress(node));
  for (const node of transaction.readNode(root).children) queue.request(outputAddress(node));
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
      } else for (const binding of executions.get(node)!.bindings) diagnosticNamespace.commitForkChange(binding);
    }
  };
  collectDeclarations(root);
  for (const node of transaction.readNode(root).children)
    append(rootFrame.state, executions.get(node)!, rootExecutor.output);
  if (pending.size !== 0) throw createExecutionInvariantError('Weave computations did not reach output readiness');
  return finalizeSceneCompilation<TComposite>(source, runtime, rootExecutor.finish(rootFrame.state));
};
