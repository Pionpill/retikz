import type {
  PathResolution,
  CompiledPath,
  PreparedPathCompilation,
  ScenePrimitive,
  CanonicalPathLabel,
  PreparedStrokeLabelLayout,
  PreparedStrokeLabelEmit,
} from '@retikz/core';
import { jsonStructuralEquals } from '@retikz/foundation';

import { comparePaintResolutions } from './paint';

/** 路径能力绑定及当前完整语义的比较 */
export const comparePathResolutions = (previous: PathResolution, current: PathResolution): boolean =>
  previous.definition === current.definition &&
  comparePaintResolutions(previous.canon.fill, current.canon.fill) &&
  comparePaintResolutions(previous.canon.stroke, current.canon.stroke) &&
  jsonStructuralEquals(previous.canon, current.canon) &&
  compareStrokeBindings(previous.stroke, current.stroke);

/** 比较已选用的标记能力与确定化参数，Map 的声明对象身份不参与语义比较 */
const compareStrokeBindings = (previous: PathResolution['stroke'], current: PathResolution['stroke']): boolean => {
  if (previous === undefined || current === undefined) return previous === current;
  const oldMarks = [...previous.arrows.values(), ...previous.marks.values()];
  const newMarks = [...current.arrows.values(), ...current.marks.values()];
  return (
    oldMarks.length === newMarks.length &&
    oldMarks.every((mark, index) => {
      const next = newMarks[index];
      return (
        mark.definition === next.definition &&
        comparePaintResolutions(mark.mark.fill, next.mark.fill) &&
        comparePaintResolutions(mark.mark.stroke, next.mark.stroke) &&
        jsonStructuralEquals(mark.mark, next.mark) &&
        jsonStructuralEquals(mark.geometry, next.geometry)
      );
    })
  );
};

/** 选择仍有效的标准描边原子产物；Definition 回调始终由 Core 执行 */
export const preparePathCompilation = (
  previous: { canon: PathResolution; compiled: CompiledPath },
  current: PathResolution,
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
  const targetsEqual = jsonStructuralEquals(stepsOf(old), stepsOf(current));
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
