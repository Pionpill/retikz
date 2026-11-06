import type { PropertyPath } from '@retikz/foundation';
import { encodePropertyPath } from '@retikz/foundation';
import { pointAtArcAngle } from '@retikz/math';

import type { Transform } from '../../../contract';
import type { CanonicalPathStep, PathResolution } from '../../../resolve';
import type { IRPosition, IRTarget } from '../../../schemas';
import { isRelativeAccumulateTargetLike, isRelativeTargetLike } from '../../../shared';
import type { BoundPathResolution, PathCompileContext, PathTargetResolver, TargetResolution } from '../types';

/** 通过调用方提供的解析器读取目标的局部坐标，无法解析时返回 null */
const pointOfTarget = (
  target: IRTarget,
  resolver: PathTargetResolver | undefined,
  scopeChain: ReadonlyArray<Transform>,
): IRPosition | null => resolver?.pointOfTarget(target, scopeChain) ?? null;

/** 优先获取目标的完整绑定；未提供绑定时读取坐标，参考点缺省时沿用局部点 */
const bindTarget = (
  target: IRTarget,
  context: Partial<Pick<PathCompileContext, 'scopeChain' | 'targetResolver'>>,
  scopeChain: ReadonlyArray<Transform>,
): TargetResolution => {
  const bound = context.targetResolver?.bindTarget?.(target, scopeChain);
  if (bound !== null && bound !== undefined) return bound;

  const point = pointOfTarget(target, context.targetResolver, scopeChain);
  const referencePoint = context.targetResolver?.refPointOfTarget?.(target, scopeChain) ?? point;

  return { target, point, referencePoint };
};

/**
 * 解析路径步骤中可确定的目标坐标，并按字段路径登记绑定结果
 * @description 普通相对目标不更新后续偏移的基点，累积相对目标会更新；经过轴向线或平滑步骤后，后续相对目标保留给编译游标处理
 */
const bindPathStepTargets = (
  steps: ReadonlyArray<CanonicalPathStep>,
  context: Partial<Pick<PathCompileContext, 'scopeChain' | 'targetResolver'>>,
  targets: Map<string, TargetResolution>,
  prefix: PropertyPath,
): Array<CanonicalPathStep> => {
  const resolver = context.targetResolver;
  const scopeChain = context.scopeChain ?? [];
  let previous: IRPosition | null = null;
  let deferRelative = false;
  const out: Array<CanonicalPathStep> = [];

  const bindStepTarget = (target: IRTarget, key: PropertyPath): IRTarget => {
    let value = target;
    if (isRelativeTargetLike(target) && !deferRelative) {
      const base = previous ?? [0, 0];
      value = [base[0] + target.relative[0], base[1] + target.relative[1]];
    } else if (isRelativeAccumulateTargetLike(target) && !deferRelative) {
      const base = previous ?? [0, 0];
      value = [base[0] + target.relativeAccumulate[0], base[1] + target.relativeAccumulate[1]];
    }

    targets.set(encodePropertyPath(key), bindTarget(value, context, scopeChain));

    return value;
  };

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    if (step.kind === 'cycle' || step.kind === 'circlePath' || step.kind === 'ellipsePath') {
      out.push(step);
      continue;
    }

    if (step.kind === 'axis-line') {
      deferRelative = true;
      const value = bindStepTarget(step.to, [...prefix, 'children', index, 'to']) as typeof step.to;
      out.push({ ...step, to: value });
      continue;
    }

    if (step.kind === 'arc') {
      const center =
        step.center === undefined ? undefined : bindStepTarget(step.center, [...prefix, 'children', index, 'center']);
      out.push(center === undefined ? step : { ...step, center });
      if (previous && typeof step.radius === 'number' && step.center === undefined) {
        previous = pointAtArcAngle(previous, step.radius, step.endAngle);
      }
      continue;
    }

    if (step.kind === 'smooth') {
      let smoothPrevious: IRPosition | null = previous;
      const points = step.points.map((target, pointIndex) => {
        const key = [...prefix, 'children', index, 'points', pointIndex];
        let value: IRTarget = target;
        if (isRelativeTargetLike(target) && !deferRelative) {
          const base = smoothPrevious ?? [0, 0];
          value = [base[0] + target.relative[0], base[1] + target.relative[1]];
        } else if (isRelativeAccumulateTargetLike(target) && !deferRelative) {
          const base = smoothPrevious ?? [0, 0];
          value = [base[0] + target.relativeAccumulate[0], base[1] + target.relativeAccumulate[1]];
        }

        const binding = bindTarget(value, context, scopeChain);
        targets.set(encodePropertyPath(key), binding);
        const point = binding.point;
        if (point && !isRelativeTargetLike(target)) smoothPrevious = point;
        if (point && isRelativeAccumulateTargetLike(target)) smoothPrevious = point;

        return value;
      });
      previous = smoothPrevious;
      deferRelative = true;
      out.push({ ...step, points });
      continue;
    }

    if (step.kind === 'rectangle') {
      const from = bindStepTarget(step.from, [...prefix, 'children', index, 'from']);
      const to = bindStepTarget(step.to, [...prefix, 'children', index, 'to']);
      out.push({ ...step, from, to });
      continue;
    }

    const value = bindStepTarget(step.to, [...prefix, 'children', index, 'to']);
    out.push({ ...step, to: value });
    if (!isRelativeTargetLike(step.to)) {
      const point = pointOfTarget(value, resolver, scopeChain);
      if (point) previous = point;
    }
  }

  return out;
};

/** 将缓存中已归一化的目标应用到当前步骤，保留当前标签及其余属性 */
const restorePathStepTargets = (
  steps: ReadonlyArray<CanonicalPathStep>,
  targets: BoundPathResolution['targets'],
  prefix: PropertyPath,
): Array<CanonicalPathStep> =>
  steps.map((step, index) => {
    const targetAt = (field: string, target: IRTarget, pointIndex?: number): IRTarget =>
      targets.get(
        encodePropertyPath([...prefix, 'children', index, field, ...(pointIndex === undefined ? [] : [pointIndex])]),
      )?.target ?? target;
    switch (step.kind) {
      case 'cycle':
      case 'circlePath':
      case 'ellipsePath':
        return step;
      case 'arc':
        return step.center === undefined ? step : { ...step, center: targetAt('center', step.center) };
      case 'smooth':
        return { ...step, points: step.points.map((target, pointIndex) => targetAt('points', target, pointIndex)) };
      case 'rectangle':
        return { ...step, from: targetAt('from', step.from), to: targetAt('to', step.to) };
      case 'axis-line':
        return { ...step, to: targetAt('to', step.to) as typeof step.to };
      default:
        return { ...step, to: targetAt('to', step.to) };
    }
  });

/** 在布局引用就绪后绑定路径目标，不重复解析样式和默认值 */
export const bindPathTargets = (
  resolution: PathResolution,
  context: Partial<Pick<PathCompileContext, 'scopeChain' | 'targetResolver'>>,
  prepared?: BoundPathResolution['targets'],
): BoundPathResolution => {
  if (prepared !== undefined)
    return {
      ...resolution,
      canon:
        resolution.canon.children === undefined
          ? resolution.canon
          : {
              ...resolution.canon,
              children: restorePathStepTargets(resolution.canon.children, prepared, resolution.irPath),
            },
      targets: prepared,
    };
  const targets = new Map<string, TargetResolution>();
  const children =
    resolution.canon.children === undefined
      ? undefined
      : bindPathStepTargets(resolution.canon.children, context, targets, resolution.irPath);
  return {
    ...resolution,
    canon: children === undefined ? resolution.canon : { ...resolution.canon, children },
    targets,
  };
};
