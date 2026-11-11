import type { AnyCompositeDefinition, IRScene } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';

import { assembleCompileSubtree, finalizeSceneCompilation, SubtreeCompiler } from '../compile/execution';
import type { CompileChildTask, CompileContribution, ScopeExecutionSteps } from '../compile/execution';
import type {
  CompileRuntime,
  CompileStageProducts,
  CompileStageComputation,
  TypedCompileStageRecord,
} from '../compile/runtime';
import { createExecutionInvariantError } from '../compile/runtime';
import { createWeaveStageController } from './cache';
import type { CompileStageCache } from './cache';
import { WeaveTaskGraph } from './schedule';
import { compileWeaveScope } from './scope';
import type { WeaveNode } from './shared';

/** 本批候选变化与消费回调，不持久保存调度投影 */
export type WeaveUpdateRequest = {
  /** 保留变化来源与影响范围，由实际阶段消费 */
  inputs: NonNullable<WeaveNode['pending']>['pendingInputs'];
  /** 将稳定依赖身份映射到本批声明位置 */
  producerPath: (producer: WeaveNode) => PropertyPath | undefined;
  /** 只有输出阶段完成才能清除已处理通知 */
  consume: () => void;
};

/**
 * 按候选失效集合选择阶段，在输出需要产物时执行
 * @description 清洁产物直接进入组装，不探测输入或重新读取引用；Scope 子布局先于包络，Path 等待最终名称与投影
 */
export const executeWeaveUpdate = <TComposite extends AnyCompositeDefinition>(
  root: IRScene,
  runtime: CompileRuntime,
  cache: CompileStageCache,
  retained: ReadonlyMap<string, CompileContribution>,
  pending: Map<string, WeaveUpdateRequest>,
  scopeOutputs: ReadonlyMap<string, TypedCompileStageRecord<'scope'>>,
) => {
  const graph = new WeaveTaskGraph();
  const controller = createWeaveStageController(cache.read, cache.write);
  const activePaths: Array<string> = [];
  const producerPaths = new Map<object, string>();
  const scopeKeys = new Set<string>();
  const keyOf = (path: PropertyPath) => JSON.stringify(path);
  const consume = (key: string) => {
    pending.get(key)?.consume();
    pending.delete(key);
  };
  const candidate = {
    ...runtime,
    stages: {
      ...controller,
      scopeOutput: (path: PropertyPath) => scopeOutputs.get(JSON.stringify(path)),
      execute: <TPhase extends keyof CompileStageProducts>(
        stageRuntime: CompileRuntime,
        path: PropertyPath,
        phase: TPhase,
        inputs: unknown,
        computation: CompileStageComputation<TPhase>,
      ): CompileStageProducts[TPhase] => {
        const key = keyOf(path);
        const stage = `${key}:compile`;
        let result!: CompileStageProducts[TPhase];
        graph.add(stage, [], () => {
          result = controller.execute(stageRuntime, path, phase, inputs, computation);
        });
        graph.require(stage);
        if (phase === 'path') consume(key);
        return result;
      },
    },
  };
  const scheduleScope = (path: PropertyPath, prepare: () => ScopeExecutionSteps): void => {
    const key = keyOf(path);
    scopeKeys.add(key);
    compileWeaveScope(graph, key, prepare);
    consume(key);
  };
  const scheduleChildren = (tasks: ReadonlyArray<CompileChildTask>): void => {
    for (const task of tasks) {
      const key = keyOf(task.path);
      const producer = runtime.producer?.(task.path);
      if (producer !== undefined) producerPaths.set(producer, key);
      const contribution = retained.get(key);
      const request = pending.get(key);
      if (contribution === undefined && request === undefined)
        throw createExecutionInvariantError('Unscheduled Weave computation');
      const dependencies = new Set<string>();
      for (const input of request?.inputs ?? []) {
        if (input.changes.size === 0 || input.source !== 'dependency') continue;
        const producerPath = request!.producerPath(input.producer);
        if (producerPath === undefined) continue;
        const producerKey = keyOf(producerPath);
        const isAncestor =
          producerPath.length < task.path.length && producerPath.every((part, index) => task.path[index] === part);
        const dependency = isAncestor ? `${producerKey}:prepare` : `${producerKey}:element`;
        // 后代布局由 Scope envelope 等待；前向名称仍由 Core 判定，不能让旧依赖改变声明可见性
        if (graph.has(dependency)) dependencies.add(dependency);
      }
      graph.add(`${key}:element`, dependencies, () => {
        activePaths.push(key);
        try {
          if (contribution !== undefined) task.publish(contribution);
          else task.compute();
        } finally {
          activePaths.pop();
        }
        // Path 的实际计算在最终名称阶段，不能在这里只入队就消费通知
        if (contribution !== undefined || !task.deferred) consume(key);
      });
    }
    for (const task of tasks) graph.require(`${keyOf(task.path)}:element`);
  };
  const subtree = runtime.state.execution.namespaceStack.observeReferences(
    (_name, entry) => {
      if (entry?.producer === undefined || entry.state !== 'resolved') return;
      const producerKey = producerPaths.get(entry.producer);
      if (producerKey === undefined || producerKey === activePaths.at(-1)) return;
      const dependency = scopeKeys.has(producerKey) ? `${producerKey}:project` : `${producerKey}:element`;
      graph.require(dependency);
    },
    () =>
      new SubtreeCompiler(root.children, candidate, {
        scheduleChildren,
        scheduleScope,
        // 只有已选中 Composite 的隔离 probe/generated 子树使用完整执行
        compileSubtree: assembleCompileSubtree,
      }).run(),
  );
  graph.finish();
  if (pending.size !== 0)
    throw createExecutionInvariantError('Weave computations did not reach their readiness boundary');
  return finalizeSceneCompilation<TComposite>(root, candidate, subtree);
};
