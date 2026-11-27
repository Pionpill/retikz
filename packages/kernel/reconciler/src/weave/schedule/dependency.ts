import { calculateScopeEnvelopeBounds } from '@retikz/core';
import type { CompiledReferenceGeometry } from '@retikz/core';
import { compareProperties, jsonStructuralEquals } from '@retikz/foundation';
import type { AxisAlignedBounds } from '@retikz/math';

import { shouldEmitScopeGroup } from '../../compile';
import { compareReferenceGeometry } from '../shared';
import type { WeaveDependencyKind, WeaveEntry, WeaveRoot, WeaveScopeEntry } from '../shared';
import type { WeaveTransaction } from '../state';
import type { WeaveTaskAddress } from './task';
import type { WeaveAssembledOutput, WeaveElementExecution, WeaveUpdateRequest } from './types';

type WeaveDependencyContext = {
  root: WeaveRoot;
  transaction: WeaveTransaction;
  pending: Map<WeaveEntry, WeaveUpdateRequest>;
  executions: Map<WeaveEntry, WeaveElementExecution>;
  assembled: Map<WeaveEntry, WeaveAssembledOutput>;
  changedOutputs: Set<WeaveScopeEntry>;
  prepareAddress: (entry: WeaveEntry) => WeaveTaskAddress;
  outputAddress: (entry: WeaveEntry) => WeaveTaskAddress;
  requestTask: (address: WeaveTaskAddress) => void;
  requireTask: (address: WeaveTaskAddress) => void;
};

/** 严格位于旧矩形内部的贡献不会提供或替换任一边界，包括数值平局 */
const isInteriorContribution = (
  layouts: ReadonlyArray<CompiledReferenceGeometry>,
  bounds: Readonly<AxisAlignedBounds>,
): boolean => {
  const child = calculateScopeEnvelopeBounds(layouts);
  return (
    child !== undefined &&
    child.minX > bounds.minX &&
    child.maxX < bounds.maxX &&
    child.minY > bounds.minY &&
    child.maxY < bounds.maxY
  );
};

/** 本批依赖就绪与直接消费者通知；实际阶段执行仍由队列回调负责 */
export const createWeaveDependencyFlow = ({
  root,
  transaction,
  pending,
  executions,
  assembled,
  changedOutputs,
  prepareAddress,
  outputAddress,
  requestTask,
  requireTask,
}: WeaveDependencyContext) => {
  // ⚡直接变化的子项已在本批请求中，查询父级就绪时无需遍历兄弟寻找它
  const initialEntry = pending.size === 1 ? pending.keys().next().value : undefined;
  const initialParent = initialEntry?.current?.parent;
  const layoutParent =
    initialEntry !== undefined &&
    initialParent?.type === 'scope' &&
    initialParent.current?.dependencies.has(initialEntry)
      ? initialParent
      : undefined;
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
    if (pending.has(entry) || executions.has(entry)) return true;
    if (entry === layoutParent) return true;
    if (seen.has(entry)) return false;
    seen.add(entry);
    const state = transaction.readState(entry);
    for (const producer of state.dependencies.keys()) if (mayChange(producer, seen)) return true;
    for (const ancestor of ancestorsOf(entry)) {
      if (pending.has(ancestor) || executions.has(ancestor)) return true;
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
    if (!pending.has(entry) && !executions.has(entry))
      pending.set(entry, {
        check: entry.type === 'scope' ? undefined : entry.current?.contribution,
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
    if (pending.has(entry)) requireTask(prepareAddress(entry));
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
        // ⚡自身属性已要求输出分组时，不必向后代查找第一个可绘制子项
        if (
          shouldEmitScopeGroup(
            0,
            state.compile.value.layout.overall.transforms,
            state.compile.value.emit.overall.id,
            state.compile.value.emit.overall.clipRef !== undefined,
          )
        )
          return 1;
        return state.children.some(child => previousCount(child) > 0) ? 1 : 0;
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
    const previousContribution = producer.type === 'scope' ? undefined : producer.current?.contribution;
    const previousBindings = previousContribution?.bindings ?? [];
    const bindings = executions.get(producer)?.bindings ?? [];
    if (producer.type === 'composite') {
      const before = new Set(previousBindings.map(binding => binding.id));
      const after = new Set(bindings.map(binding => binding.id));
      for (const name of new Set([...before, ...after])) {
        if (before.has(name) === after.has(name)) continue;
        for (const reader of transaction.readState(root).readers.get(name) ?? []) {
          if (reader !== producer && reader.current !== null) notify(reader);
        }
      }
    }
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
              previousContribution?.output.geometries,
              executions.get(producer)!.frame.state.geometries,
            )
          : previousBindings.length !== bindings.length ||
            bindings.some((binding, index) => {
              const previous = previousBindings[index];
              return (
                previous.id !== binding.id ||
                !jsonStructuralEquals(previous.entry.irPath, binding.entry.irPath) ||
                !compareReferenceGeometry(previous.entry.geometry, binding.entry.geometry, kind)
              );
            });
      return previousChanged;
    };
    if (producer.type === 'scope') {
      if (
        state.consumers.size > 0 &&
        task.phase === 'project' &&
        (transaction.readState(producer).origin.own.id === undefined ||
          !jsonStructuralEquals(
            producer.current?.compile?.value.layout.overall,
            executions.get(producer)!.scope!.compiled.layout.overall,
          ))
      )
        for (const consumer of state.consumers) notify(consumer);
    } else {
      for (const consumer of state.consumers) {
        const kinds = transaction.readState(consumer).dependencies.get(producer);
        if (!kinds?.some(channelChanged)) continue;
        // ⚡具名 Scope 只向父级投影自己的包络。旧、新子贡献均在内部时，
        // 不调度父级布局；其它读取、匿名投影与绘制输出仍走原有通道
        if (
          consumer.type === 'scope' &&
          consumer === state.parent &&
          kinds.length === 1 &&
          kinds[0] === 'layout' &&
          consumer.current?.origin.own.id !== undefined
        ) {
          const bounds = consumer.current.compile?.envelopeBounds;
          const previous = previousContribution?.output.geometries;
          if (
            bounds !== undefined &&
            previous !== undefined &&
            isInteriorContribution(previous, bounds) &&
            isInteriorContribution(executions.get(producer)!.frame.state.geometries, bounds)
          ) {
            if (assembled.size !== 0) {
              assembled.delete(consumer);
              for (const ancestor of ancestorsOf(consumer)) assembled.delete(ancestor);
            }
            continue;
          }
        }
        notify(consumer);
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
