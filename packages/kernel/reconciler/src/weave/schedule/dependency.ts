import { compareProperties, jsonStructuralEquals } from '@retikz/foundation';

import { shouldEmitScopeGroup } from '../../compile';
import { compareReferenceGeometry } from '../shared';
import type { WeaveDependencyKind, WeaveEntry, WeaveScopeEntry } from '../shared';
import type { WeaveTransaction } from '../state';
import type { WeaveTaskAddress } from './task';
import type { WeaveAssembledOutput, WeaveElementExecution, WeaveUpdateRequest } from './types';

type WeaveDependencyContext = {
  transaction: WeaveTransaction;
  pending: Map<string, WeaveUpdateRequest>;
  executions: Map<WeaveEntry, WeaveElementExecution>;
  assembled: Map<WeaveEntry, WeaveAssembledOutput>;
  changedOutputs: Set<WeaveScopeEntry>;
  keyOf: (entry: WeaveEntry) => string;
  prepareAddress: (entry: WeaveEntry) => WeaveTaskAddress;
  outputAddress: (entry: WeaveEntry) => WeaveTaskAddress;
  requestTask: (address: WeaveTaskAddress) => void;
  requireTask: (address: WeaveTaskAddress) => void;
};

/** 本批依赖就绪与直接消费者通知；实际阶段执行仍由队列回调负责 */
export const createWeaveDependencyFlow = ({
  transaction,
  pending,
  executions,
  assembled,
  changedOutputs,
  keyOf,
  prepareAddress,
  outputAddress,
  requestTask,
  requireTask,
}: WeaveDependencyContext) => {
  const ancestorsOf = (entry: WeaveEntry): Array<WeaveScopeEntry> => {
    const ancestors: Array<WeaveScopeEntry> = [];
    let parent = transaction.readState(entry).parent;
    while (parent.type !== 'root') {
      ancestors.push(parent);
      parent = transaction.readState(parent).parent;
    }
    return ancestors;
  };
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
    requestTask(prepareAddress(entry));
    requestTask(outputAddress(entry));
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
    if (pending.has(keyOf(entry))) requireTask(prepareAddress(entry));
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
    if (executions.has(entry)) requireTask({ entry, phase: 'project' });
  };
  const notifyConsumers = (task: WeaveTaskAddress) => {
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
    // ⚡同一生产者的本次通知只比较一次连续相同的通道，不跨生产者、阶段或事务复用
    let previousKind: WeaveDependencyKind | undefined;
    let previousChanged = false;
    const channelChanged = (kind: WeaveDependencyKind): boolean => {
      if (
        kind === previousKind ||
        (typeof kind === 'object' &&
          typeof previousKind === 'object' &&
          kind.anchor === previousKind.anchor &&
          kind.boundary === previousKind.boundary)
      )
        return previousChanged;
      previousKind = kind;
      previousChanged =
        kind === 'layout'
          ? !jsonStructuralEquals(
              producer.current?.contribution?.output.geometries,
              executions.get(producer)!.frame.state.geometries,
            )
          : previousBindings.length !== bindings.length ||
            bindings.some((binding, index) => {
              const previous = previousBindings[index];
              return (
                previous.id !== binding.id ||
                !compareReferenceGeometry(previous.entry.geometry, binding.entry.geometry, kind)
              );
            });
      return previousChanged;
    };
    if (producer.type === 'scope') {
      if (
        state.consumers.size > 0 &&
        task.phase === 'project' &&
        !jsonStructuralEquals(
          producer.current?.compile?.value.layout.overall,
          executions.get(producer)!.scope!.compiled.layout.overall,
        )
      )
        for (const consumer of state.consumers) notify(consumer);
    } else {
      for (const consumer of state.consumers) {
        if (transaction.readState(consumer).dependencies.get(producer)?.some(channelChanged)) notify(consumer);
      }
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
  };
  return { ancestorsOf, descendants, notify, ensureDependencies, ensure, requireProjection, notifyConsumers };
};
