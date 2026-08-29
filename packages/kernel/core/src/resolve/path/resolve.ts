import { pointAtArcAngle } from '@retikz/math';

import type { Transform } from '../../contract';
import type {
  IRArrowMark,
  IRGeometryLabel,
  IRMathRun,
  IRPaintValue,
  IRPathBase,
  IRPosition,
  IRStep,
  IRTarget,
  IRTextRun,
} from '../../schemas';
import type { ResolvedInlineSourceRun, ResolvedLabelTextContent } from '../text';
import type {
  CanonicalGeometryLabel,
  CanonicalPath,
  CanonicalStep,
  PathResolution,
  PathResolveContext,
  PathTargetResolver,
  ResolvedArrowMark,
  ResolvedGeometryLabel,
  ResolvedPathSource,
  ResolvedStepSource,
  TargetResolution,
} from './types';

import {
  isAtPositionLike,
  isBetweenPositionLike,
  isNodeTargetLike,
  isOffsetPositionLike,
  isPolarPositionLike,
  isPositionTuple,
  isRelativeAccumulateTargetLike,
  isRelativeTargetLike,
} from '../../shared';
import { resolvePaint } from '../resource';
import { resolveContextualColor, resolveEffectiveLabelDefault, resolveEffectivePath } from '../style';
import { resolveDropShadow } from '../style';
import { resolvePathKind } from './provider';

const LABEL_POSITION: Record<string, number> = {
  'at-start': 0,
  'very-near-start': 0.125,
  'near-start': 0.25,
  midway: 0.5,
  'near-end': 0.75,
  'very-near-end': 0.875,
  'at-end': 1,
};

const canonicalizeLabel = (label: ResolvedGeometryLabel): CanonicalGeometryLabel => ({
  ...label,
  position:
    label.position === undefined
      ? 0.5
      : typeof label.position === 'number'
        ? label.position
        : (LABEL_POSITION[label.position] ?? 0.5),
  side: label.side ?? (label.sloped === true || label.placement === 'inside' ? 'center' : 'top'),
  distance: label.distance ?? 4,
});

const canonicalizeStep = (step: ResolvedStepSource): CanonicalStep => {
  if (step.kind === 'move' || step.kind === 'cycle' || step.kind === 'rectangle') return step;
  const label = step.label === undefined ? undefined : canonicalizeLabel(step.label);
  if (step.kind === 'fold') {
    switch (step.via) {
      case '-|-':
      case '|-|':
        return { ...step, label, fraction: step.fraction ?? 0.5 };
      case '-|':
      case '|-':
        return { ...step, label };
    }
  }
  if (step.kind === 'smooth') return { ...step, label, tension: step.tension ?? 1 };
  if (step.kind === 'bend') {
    return {
      ...step,
      label,
      bendDirection: step.bendDirection ?? 'left',
      bendAngle: step.bendAngle ?? 30,
    };
  }
  if (step.kind === 'circlePath' || step.kind === 'ellipsePath') {
    return { ...step, label, closed: step.closed ?? 'chord' };
  }
  return { ...step, label };
};

const canonicalizeSteps = (steps: ReadonlyArray<ResolvedStepSource> | undefined): Array<CanonicalStep> | undefined =>
  steps?.map(canonicalizeStep);

const canonicalizePath = (path: ResolvedPathSource): CanonicalPath => ({
  ...path,
  children: canonicalizeSteps(path.children),
  label:
    path.label === undefined
      ? undefined
      : (Array.isArray(path.label) ? path.label : [path.label]).map(canonicalizeLabel),
  shadow: resolveDropShadow(path.shadow),
});

/** 将 contextual paint 的 number 分支确定为字符串，paint object 保持不变 */
const resolvePathPaint = (
  value: IRPaintValue | undefined,
  masterColor: string | undefined,
  context: PathResolveContext,
  fieldPath: string,
): Exclude<IRPaintValue, number> | undefined =>
  typeof value === 'number' ? resolveContextualColor(value, { masterColor, mode: context.mode, fieldPath }) : value;

/** 确定 geometry label 中单个文字或公式 run 的派生颜色 */
const resolveLabelRunColor = (
  run: IRTextRun | IRMathRun,
  masterColor: string | undefined,
  context: PathResolveContext,
  fieldPath: string,
): ResolvedInlineSourceRun => {
  const { fill, ...source } = run;
  return {
    ...source,
    ...(fill === undefined
      ? {}
      : {
          fill: resolveContextualColor(fill, {
            masterColor,
            mode: context.mode,
            fieldPath: `${fieldPath}.fill`,
          }),
        }),
  };
};

/** 确定 geometry label 单行内容中各 run 的派生颜色 */
const resolveGeometryLabelText = (
  text: IRGeometryLabel['text'],
  masterColor: string | undefined,
  context: PathResolveContext,
  fieldPath: string,
): ResolvedLabelTextContent =>
  typeof text === 'string'
    ? text
    : {
        runs: text.runs.map((run, index) =>
          resolveLabelRunColor(run, masterColor, context, `${fieldPath}.runs[${index}]`),
        ),
      };

/** 确定一个 geometry label 的文字主色与 run 颜色 */
const resolveGeometryLabelColors = (
  label: IRGeometryLabel,
  masterColor: string | undefined,
  context: PathResolveContext,
  fieldPath: string,
): ResolvedGeometryLabel => {
  const { textColor, text, ...source } = label;
  const resolvedTextColor =
    textColor === undefined
      ? masterColor
      : resolveContextualColor(textColor, {
          masterColor,
          mode: context.mode,
          fieldPath: `${fieldPath}.textColor`,
        });
  const textMaster = resolvedTextColor ?? masterColor;
  return {
    ...source,
    ...(resolvedTextColor === undefined ? {} : { textColor: resolvedTextColor }),
    text: resolveGeometryLabelText(text, textMaster, context, `${fieldPath}.text`),
  };
};

/** 确定一个 step 可选 label 的派生颜色 */
const resolveStepLabelColors = (
  step: IRStep,
  masterColor: string | undefined,
  context: PathResolveContext,
  fieldPath: string,
): ResolvedStepSource => {
  if (!('label' in step)) return step as ResolvedStepSource;
  const { label, ...source } = step;
  if (label === undefined) return source;
  return {
    ...source,
    label: resolveGeometryLabelColors(label, masterColor, context, `${fieldPath}.label`),
  };
};

/** 确定 arrow color 后再以该颜色为 master 确定 fill */
const resolveArrowColors = (
  mark: IRArrowMark,
  masterColor: string | undefined,
  context: PathResolveContext,
  fieldPath: string,
): ResolvedArrowMark => {
  const { color, fill, ...source } = mark;
  const resolvedColor =
    color === undefined
      ? masterColor
      : resolveContextualColor(color, {
          masterColor,
          mode: context.mode,
          fieldPath: `${fieldPath}.color`,
        });
  return {
    ...source,
    ...(resolvedColor === undefined ? {} : { color: resolvedColor }),
    ...(fill === undefined
      ? {}
      : {
          fill: resolveContextualColor(fill, {
            masterColor: resolvedColor,
            mode: context.mode,
            fieldPath: `${fieldPath}.fill`,
          }),
        }),
  };
};

/** 在 provider 消费前确定 Path、label 与 arrow 的所有上下文颜色 */
const resolvePathContextualColors = (
  path: IRPathBase,
  context: PathResolveContext,
  irPath: string,
  labelMasterColor: string | undefined,
): ResolvedPathSource => {
  const { fill, stroke, children, label, marks, ...source } = path;
  const masterColor = path.color;
  const resolvedHostLabel =
    label === undefined
      ? undefined
      : Array.isArray(label)
        ? label.map((item, index) =>
            resolveGeometryLabelColors(item, labelMasterColor, context, `${irPath}.label[${index}]`),
          )
        : resolveGeometryLabelColors(label, labelMasterColor, context, `${irPath}.label`);
  return {
    ...source,
    ...(fill === undefined ? {} : { fill: resolvePathPaint(fill, masterColor, context, `${irPath}.fill`) }),
    ...(stroke === undefined ? {} : { stroke: resolvePathPaint(stroke, masterColor, context, `${irPath}.stroke`) }),
    ...(children === undefined
      ? {}
      : {
          children: children.map((step, index) =>
            resolveStepLabelColors(step, labelMasterColor, context, `${irPath}.children[${index}]`),
          ),
        }),
    ...(resolvedHostLabel === undefined ? {} : { label: resolvedHostLabel }),
    ...(marks === undefined
      ? {}
      : {
          marks: marks.map((item, index) => ({
            ...item,
            mark: resolveArrowColors(item.mark, masterColor, context, `${irPath}.marks[${index}].mark`),
          })),
        }),
  };
};

const pointOfTarget = (
  target: IRTarget,
  resolver: PathTargetResolver | undefined,
  scopeChain: ReadonlyArray<Transform>,
): IRPosition | null => resolver?.pointOfTarget(target, scopeChain) ?? null;

const bindTarget = (
  target: IRTarget,
  context: PathResolveContext,
  scopeChain: ReadonlyArray<Transform>,
): TargetResolution => {
  const bound = context.targetResolver?.bindTarget?.(target, scopeChain);
  if (bound !== null && bound !== undefined) return bound;
  const point = pointOfTarget(target, context.targetResolver, scopeChain);
  const referencePoint = context.targetResolver?.refPointOfTarget?.(target, scopeChain) ?? point;
  return { target, point, referencePoint };
};

/** 在 resolve 阶段完成 path relative / relativeAccumulate / smooth target 绑定 */
const resolveSteps = (
  steps: ReadonlyArray<CanonicalStep>,
  context: PathResolveContext,
  targets: Map<string, TargetResolution>,
  prefix: string,
): Array<CanonicalStep> => {
  const resolver = context.targetResolver;
  const scopeChain = context.scopeChain ?? [];
  let previous: IRPosition | null = null;
  let deferRelative = false;
  const out: Array<CanonicalStep> = [];
  const resolve = (target: IRTarget, key: string): IRTarget => {
    let value = target;
    if (isRelativeTargetLike(target) && !deferRelative) {
      const base = previous ?? [0, 0];
      value = [base[0] + target.relative[0], base[1] + target.relative[1]];
    } else if (isRelativeAccumulateTargetLike(target) && !deferRelative) {
      const base = previous ?? [0, 0];
      value = [base[0] + target.relativeAccumulate[0], base[1] + target.relativeAccumulate[1]];
    }
    targets.set(key, bindTarget(value, context, scopeChain));
    return value;
  };
  const bindNestedTargets = (value: unknown, key: string): void => {
    const targetLike =
      typeof value === 'string' ||
      isPositionTuple(value) ||
      isAtPositionLike(value) ||
      isBetweenPositionLike(value) ||
      isOffsetPositionLike(value) ||
      isNodeTargetLike(value) ||
      isPolarPositionLike(value) ||
      isRelativeTargetLike(value) ||
      isRelativeAccumulateTargetLike(value);
    if (targetLike) {
      targets.set(key, bindTarget(value as IRTarget, context, scopeChain));
      return;
    }
    if (value !== null && typeof value === 'object') {
      for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
        bindNestedTargets(childValue, `${key}.${childKey}`);
      }
    }
  };

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    if (step.kind === 'cycle' || step.kind === 'circlePath' || step.kind === 'ellipsePath') {
      out.push(step);
      continue;
    }
    if (step.kind === 'axis-line') {
      deferRelative = true;
      const value = resolve(step.to, `${prefix}.children[${index}].to`) as typeof step.to;
      out.push({ ...step, to: value });
      continue;
    }
    if (step.kind === 'arc') {
      const center =
        step.center === undefined ? undefined : resolve(step.center, `${prefix}.children[${index}].center`);
      out.push(center === undefined ? step : { ...step, center });
      if (previous && typeof step.radius === 'number' && step.center === undefined) {
        previous = pointAtArcAngle(previous, step.radius, step.endAngle);
      }
      continue;
    }
    if (step.kind === 'smooth') {
      let smoothPrevious: IRPosition | null = previous;
      const points = step.points.map((target, pointIndex) => {
        const key = `${prefix}.children[${index}].points[${pointIndex}]`;
        let value: IRTarget = target;
        if (isRelativeTargetLike(target) && !deferRelative) {
          const base = smoothPrevious ?? [0, 0];
          value = [base[0] + target.relative[0], base[1] + target.relative[1]];
        } else if (isRelativeAccumulateTargetLike(target) && !deferRelative) {
          const base = smoothPrevious ?? [0, 0];
          value = [base[0] + target.relativeAccumulate[0], base[1] + target.relativeAccumulate[1]];
        }
        const binding = bindTarget(value, context, scopeChain);
        targets.set(key, binding);
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
    if (step.kind === 'generator') {
      bindNestedTargets(step.params, `${prefix}.children[${index}].params`);
      const to = step.to === undefined ? undefined : resolve(step.to, `${prefix}.children[${index}].to`);
      const resolvedStep = to === undefined ? step : { ...step, to };
      out.push(resolvedStep);
      if (to !== undefined) {
        const point = pointOfTarget(to, resolver, scopeChain);
        if (point) previous = point;
      }
      deferRelative = true;
      continue;
    }
    if (step.kind === 'rectangle') {
      const from = resolve(step.from, `${prefix}.children[${index}].from`);
      const to = resolve(step.to, `${prefix}.children[${index}].to`);
      out.push({ ...step, from, to });
      continue;
    }
    const value = resolve(step.to, `${prefix}.children[${index}].to`);
    out.push({ ...step, to: value });
    if (!isRelativeTargetLike(step.to)) {
      const point = pointOfTarget(value, resolver, scopeChain);
      if (point) previous = point;
    }
  }
  return out;
};

export const resolvePath = (path: IRPathBase, context: PathResolveContext): PathResolution => {
  const styled = context.styleStack === undefined ? path : resolveEffectivePath(path, context.styleStack);
  const irPath = context.irPath ?? 'path';
  const labelDefault = resolveEffectiveLabelDefault(context.styleStack ?? []);
  const labelMasterColor = labelDefault.color ?? styled.color;
  const colorsResolved = resolvePathContextualColors(styled, context, irPath, labelMasterColor);
  const kind = resolvePathKind(colorsResolved, context, irPath);
  const providerColorsResolved = resolvePathContextualColors(kind.path, context, irPath, labelMasterColor);
  const canonicalPath = canonicalizePath(providerColorsResolved);
  const targets = new Map<string, TargetResolution>();
  const scopeChain = context.scopeChain ?? [];
  const canonicalSteps =
    canonicalPath.children === undefined ? undefined : resolveSteps(canonicalPath.children, context, targets, irPath);
  const resolvedPath: CanonicalPath = {
    ...canonicalPath,
    ...(canonicalSteps === undefined ? {} : { children: canonicalSteps }),
  };
  const paintContext = {
    patterns: context.patterns,
    round: context.round,
    irPath,
  };
  const fill = resolvePaint(resolvedPath.fill, paintContext);
  const stroke = resolvePaint(resolvedPath.stroke, paintContext);
  return {
    path: resolvedPath,
    targets,
    scopeChain,
    kind,
    paint: {
      ...(fill === undefined ? {} : { fill }),
      ...(stroke === undefined ? {} : { stroke }),
    },
    style: {
      strokeWidth: resolvedPath.strokeWidth ?? 1,
      strokeRequested: resolvedPath.stroke !== undefined || resolvedPath.strokeWidth !== undefined,
      strokeFillDefault: 'none',
      strokeDefault: 'currentColor',
    },
  };
};
