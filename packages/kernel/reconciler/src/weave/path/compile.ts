import { compilePath, resolvePath } from '@retikz/core';
import type {
  PathResolution,
  CompiledPath,
  PreparedPathCompilation,
  ScenePrimitive,
  CanonicalPathLabel,
  PreparedStrokeLabelLayout,
  PreparedStrokeLabelEmit,
} from '@retikz/core';
import { compareProperties, jsonStructuralEquals } from '@retikz/foundation';

import { createPathResolveContext, createPathCompileContext } from '../../compile/execution';
import type { PendingPathEmission } from '../../compile/execution';
import { createCompileObservation } from '../../compile/runtime';
import type { CompileRuntime } from '../../compile/runtime';
import { comparePaintResolutions, matchWeaveReferences, restoreWeaveResources, retainWeaveReads } from '../shared';
import type { WeaveNode, WeaveCacheMetadata } from '../shared';
import { comparePathResolutions, compareStrokeBindings } from './compare';

/** 选择仍有效的标准描边原子产物；Definition 回调始终由 Core 执行 */
export const preparePathCompilation = (
  previous: { canon: PathResolution; compiled: CompiledPath },
  current: PathResolution,
  referencesValid = true,
): { prepared: PreparedPathCompilation; primitives: Array<ScenePrimitive> } => {
  const prepared: PreparedPathCompilation = {};
  const primitives: Array<ScenePrimitive> = [];
  const old = previous.canon;
  const cached = previous.compiled.stroke;
  if (old.definition !== current.definition || cached === undefined) return { prepared, primitives };
  const stepsOf = (path: PathResolution) =>
    path.canon.children?.map(step => {
      if (!('label' in step)) return step;
      const { label: _label, ...geometry } = step;
      return geometry;
    });
  const targetsEqual = referencesValid && jsonStructuralEquals(stepsOf(old), stepsOf(current));
  if (targetsEqual) prepared.targets = previous.compiled.targets;
  const geometryEqual = targetsEqual && old.canon.cornerRadius === current.canon.cornerRadius;
  const layout = cached.layout;
  const emit = cached.emit;
  const nextLayout: NonNullable<NonNullable<PreparedPathCompilation['stroke']>['layout']> = {};
  const nextEmit: NonNullable<NonNullable<PreparedPathCompilation['stroke']>['emit']> = {};
  if (targetsEqual) nextLayout.originalMetrics = layout?.positions?.original;
  if (geometryEqual) {
    nextLayout.geometry = layout?.geometry;
    nextLayout.metrics = layout?.metrics;
    nextLayout.positions = layout?.positions;
  }
  const opacityEqual = old.canon.opacity === current.canon.opacity;
  const labelSlots = (
    kind: 'host' | 'steps',
    before: Array<CanonicalPathLabel | undefined>,
    after: Array<CanonicalPathLabel | undefined>,
  ) => {
    const layouts: Array<PreparedStrokeLabelLayout> = [];
    const emits: Array<PreparedStrokeLabelEmit> = [];
    for (const [index, label] of after.entries()) {
      const prior = before[index];
      const oldLayout = layout?.labels?.[kind]?.[index];
      const oldEmit = emit?.labels?.[kind]?.[index];
      const nextLabelLayout: PreparedStrokeLabelLayout = {};
      const nextLabelEmit: PreparedStrokeLabelEmit = {};
      if (prior !== undefined && label !== undefined) {
        const textEqual = jsonStructuralEquals(prior.text, label.text);
        if (textEqual) nextLabelLayout.measurement = oldLayout?.measurement;
        if (textEqual && opacityEqual && prior.opacity === label.opacity) nextLabelEmit.content = oldEmit?.content;
        if (geometryEqual && jsonStructuralEquals(prior, label)) {
          nextLabelLayout.placement = oldLayout?.placement;
          if (opacityEqual) nextLabelEmit.overall = oldEmit?.overall;
        }
      }
      if (nextLabelEmit.overall != null) primitives.push(nextLabelEmit.overall);
      else if (nextLabelEmit.content !== undefined) primitives.push(...nextLabelEmit.content);
      layouts.push(nextLabelLayout);
      emits.push(nextLabelEmit);
    }
    return { layouts, emits };
  };
  const stepLabels = (path: PathResolution) =>
    (path.canon.children ?? []).map(step => ('label' in step ? step.label : undefined));
  const hosts = labelSlots('host', old.canon.label ?? [], current.canon.label ?? []);
  const steps = labelSlots('steps', stepLabels(old), stepLabels(current));
  nextLayout.labels = { host: hosts.layouts, steps: steps.layouts };
  nextEmit.labels = { host: hosts.emits, steps: steps.emits };
  const oldMarks = old.canon.marks ?? [];
  nextLayout.marks = [];
  nextEmit.marks = (current.canon.marks ?? []).map((mark, index) => {
    const prior = oldMarks.at(index);
    const priorBinding = prior === undefined ? undefined : old.stroke?.marks.get(prior);
    const binding = current.stroke?.marks.get(mark);
    const contentEqual =
      priorBinding !== undefined &&
      binding !== undefined &&
      priorBinding.definition === binding.definition &&
      comparePaintResolutions(priorBinding.mark.fill, binding.mark.fill) &&
      comparePaintResolutions(priorBinding.mark.stroke, binding.mark.stroke) &&
      jsonStructuralEquals(priorBinding.mark, binding.mark);
    const content = contentEqual ? emit?.marks?.[index]?.content : undefined;
    if (content !== undefined) primitives.push(...content);
    // 放置只依赖当前位置与几何，局部内容不保存位置历史
    nextLayout.marks!.push(
      geometryEqual &&
        prior !== undefined &&
        jsonStructuralEquals(prior, mark) &&
        old.canon.strokeWidth === current.canon.strokeWidth &&
        jsonStructuralEquals(priorBinding?.geometry, binding?.geometry)
        ? (layout?.marks?.[index] ?? {})
        : {},
    );
    return { content };
  });
  const withoutMarks = (path: PathResolution) => {
    const { marks: _marks, ...body } = path.canon;
    return body;
  };
  const bodyEqual =
    geometryEqual &&
    jsonStructuralEquals(withoutMarks(old), withoutMarks(current)) &&
    comparePaintResolutions(old.canon.stroke, current.canon.stroke) &&
    comparePaintResolutions(old.canon.fill, current.canon.fill) &&
    compareStrokeBindings(
      old.stroke === undefined ? undefined : { ...old.stroke, marks: new Map() },
      current.stroke === undefined ? undefined : { ...current.stroke, marks: new Map() },
    );
  if (bodyEqual) {
    nextLayout.body = layout?.body;
    nextEmit.body = emit?.body;
    nextEmit.arrows = emit?.arrows;
    if (nextEmit.body !== undefined) primitives.push(nextEmit.body);
  }
  prepared.stroke = { layout: nextLayout, emit: nextEmit };
  // 自定义 Definition 可能本轮不调用 emitStroke，不能预导入尚未实际消费的旧绘制资源
  if (current.stroke === undefined) {
    prepared.stroke.emit = undefined;
    primitives.length = 0;
  }
  return { prepared, primitives };
};

/** 选择有效 Path prepared 槽位并直接计算缺失产物 */
export const executeWeavePath = (
  runtime: CompileRuntime,
  pending: PendingPathEmission,
  previous?: NonNullable<Extract<WeaveNode, { type: 'path' }>['current']>,
): { canon: PathResolution; compiled: CompiledPath; cache: WeaveCacheMetadata; reused: boolean } => {
  const resolveInputs = { path: pending.path, defaults: pending.scopeDefaults, theme: pending.theme };
  const compileInputs = { scopeChain: pending.scopeChain };
  const cache = previous?.cache;
  const before = previous?.canon;
  const observation = createCompileObservation(runtime);
  const canon =
    before != null &&
    cache?.diagnostics.length === 0 &&
    compareProperties(cache.resolveInputs, resolveInputs, { depth: 2 })
      ? before
      : resolvePath(pending.path, createPathResolveContext(observation.runtime, pending));
  const referencesValid =
    cache !== undefined && matchWeaveReferences(cache.reads, runtime.state.execution.namespaceStack);
  const canRetain = cache?.diagnostics.length === 0 && jsonStructuralEquals(cache.compileInputs, compileInputs);
  if (
    before != null &&
    previous?.compiled != null &&
    canRetain &&
    referencesValid &&
    observation.diagnostics.length === 0 &&
    comparePathResolutions(before, canon)
  ) {
    restoreWeaveResources(runtime, cache);
    return { canon, compiled: previous.compiled, cache: { ...cache, resolveInputs, compileInputs }, reused: true };
  }
  const selected =
    before != null && previous?.compiled != null && canRetain
      ? preparePathCompilation({ canon: before, compiled: previous.compiled }, canon, referencesValid)
      : undefined;
  if (selected !== undefined) restoreWeaveResources(observation.runtime, cache!, selected.primitives);
  const compiled = runtime.state.execution.namespaceStack.observeReferences(observation.read, () =>
    compilePath(canon, createPathCompileContext(observation.runtime, pending), selected?.prepared),
  );
  if (referencesValid && selected !== undefined) retainWeaveReads(observation.reads, cache.reads);
  return { canon, compiled, cache: { ...observation.facts(), resolveInputs, compileInputs }, reused: false };
};
