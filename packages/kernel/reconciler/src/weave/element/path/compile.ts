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

import { createPathCompileContext, createPathResolveContext } from '../../../compile';
import type { CompileRuntime, PendingPathEmission } from '../../../compile';
import {
  compareTextBlocks,
  createWeaveObservation,
  matchWeaveReferences,
  restoreWeaveResources,
  retainWeaveReads,
} from '../../shared';
import type { WeaveStages, WeavePathState, WeaveReferenceRead } from '../../shared';
import {
  comparePathResolutions,
  compareStrokeBindings,
  compareCanonicalPaths,
  comparePathStepGeometry,
  comparePathMarkContent,
  retainPathResolution,
} from './compare';

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
  const targetsEqual = referencesValid && comparePathStepGeometry(old.canon.children, current.canon.children);
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
        const textEqual = compareTextBlocks(prior.text, label.text);
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
      priorBinding !== undefined && binding !== undefined && comparePathMarkContent(priorBinding, binding);
    const content = contentEqual ? emit?.marks?.[index]?.content : undefined;
    if (content !== undefined) primitives.push(...content);
    // 放置只依赖当前位置与几何，局部内容不保存位置历史
    nextLayout.marks!.push(
      geometryEqual &&
        prior !== undefined &&
        jsonStructuralEquals(prior, mark) &&
        old.canon.strokeWidth === current.canon.strokeWidth &&
        compareProperties(priorBinding?.geometry, binding?.geometry, { depth: 2 })
        ? (layout?.marks?.[index] ?? {})
        : {},
    );
    return { content };
  });
  const bodyEqual =
    geometryEqual &&
    compareCanonicalPaths(old.canon, current.canon, false) &&
    compareStrokeBindings(old.stroke, current.stroke, false);
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

/** 按输入、编译上下文与引用依赖复用路径产物，变化时保留有效的 prepared 槽位 */
export const executeWeavePath = (
  runtime: CompileRuntime,
  pending: PendingPathEmission,
  previous?: WeaveStages<WeavePathState>,
): {
  resolve: NonNullable<WeavePathState['resolve']>;
  compile: NonNullable<WeavePathState['compile']>;
  referenceReads: ReadonlyArray<WeaveReferenceRead>;
  reused: boolean;
} => {
  // 排队只在过滤动画时改写 path；解析不依赖 Node 默认值或主题外壳
  const resolveInputs = { path: pending.path, pathDefaults: pending.scopeDefaults.path, mode: pending.theme.mode };
  const compileInputs = { scopeChain: pending.scopeChain };
  const previousCompile = previous?.compile;
  const previousReads = previous?.referenceReads ?? [];
  const priorResolve = previous?.resolve;
  const before = priorResolve?.value;
  let observation: ReturnType<typeof createWeaveObservation> | undefined;
  let canon = before;

  // 1. 未命中解析阶段时才创建资源与诊断收集器
  if (
    priorResolve?.value == null ||
    previousCompile?.diagnostics.length !== 0 ||
    priorResolve.context.mode !== resolveInputs.mode ||
    !jsonStructuralEquals(priorResolve.context.pathDefaults, resolveInputs.pathDefaults) ||
    !jsonStructuralEquals(priorResolve.input, resolveInputs.path)
  ) {
    observation = createWeaveObservation(runtime, 'output');
    canon = retainPathResolution(
      before,
      resolvePath(pending.path, createPathResolveContext(observation.runtime, pending)),
    );
  } else {
    canon = priorResolve.value;
  }

  // 2. 核对引用、编译上下文与解析结果，并要求新旧诊断均允许整体复用
  const referencesValid =
    previousCompile !== undefined && matchWeaveReferences(previousReads, runtime.state.execution.namespaceStack);
  const canRetain =
    previousCompile?.diagnostics.length === 0 &&
    jsonStructuralEquals(previousCompile.context.scopeChain, compileInputs.scopeChain);
  if (
    before != null &&
    previous?.compile?.value != null &&
    canRetain &&
    referencesValid &&
    !observation?.diagnostics.length &&
    comparePathResolutions(before, canon)
  ) {
    restoreWeaveResources(runtime, previousCompile.resources);
    return {
      resolve: {
        input: pending.path,
        context: { pathDefaults: resolveInputs.pathDefaults, mode: resolveInputs.mode },
        value: canon,
      },
      compile: { ...previousCompile, context: compileInputs },
      referenceReads: previousReads,
      reused: true,
    };
  }

  observation ??= createWeaveObservation(runtime, 'output');
  // 3. 整体不能复用时，选择有效 prepared 槽位并恢复其使用的绘制资源
  const selected =
    before != null && previous?.compile?.value != null && canRetain
      ? preparePathCompilation({ canon: before, compiled: previous.compile.value }, canon, referencesValid)
      : undefined;
  if (selected !== undefined)
    restoreWeaveResources(observation.runtime, previousCompile!.resources, selected.primitives);
  const compiled = runtime.state.execution.namespaceStack.observeReferences(observation.read, () =>
    compilePath(canon, createPathCompileContext(observation.runtime, pending), selected?.prepared),
  );
  // 局部复用可能跳过原有读取，保留仍有效的依赖事实
  if (referencesValid && selected !== undefined) retainWeaveReads(observation.reads, previousReads);
  return {
    resolve: {
      input: pending.path,
      context: { pathDefaults: resolveInputs.pathDefaults, mode: resolveInputs.mode },
      value: canon,
    },
    compile: { ...observation.facts(), context: compileInputs, value: compiled },
    referenceReads: observation.reads,
    reused: false,
  };
};
