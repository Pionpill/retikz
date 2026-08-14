import { arcEndPoint } from '@retikz/math';

import type { Transform } from '../../contract';
import type {
  IRGeometryLabel,
  IRPathBase,
  IRPathRibbonOptions,
  IRPosition,
  IRRibbonSampling,
  IRRibbonWidth,
  IRStep,
  IRTarget,
} from '../../schemas';
import type {
  CanonicalGeometryLabel,
  CanonicalPath,
  CanonicalRibbonEndpoint,
  CanonicalRibbonOptions,
  CanonicalRibbonSampling,
  CanonicalRibbonWidth,
  CanonicalStep,
  PathResolution,
  PathResolveContext,
  PathTargetResolver,
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
import { resolveEffectivePath } from '../style';
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

const canonicalizeLabel = (label: IRGeometryLabel): CanonicalGeometryLabel => ({
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

const canonicalizeStep = (step: IRStep): CanonicalStep => {
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
  return { ...step, label };
};

const canonicalizeSteps = (steps: ReadonlyArray<IRStep> | undefined): Array<CanonicalStep> | undefined =>
  steps?.map(canonicalizeStep);

const canonicalizeRibbonWidth = (width: IRRibbonWidth | undefined): CanonicalRibbonWidth | undefined => {
  if (width === undefined || typeof width === 'number' || width.kind === 'profile') return width;
  return {
    ...width,
    interpolation: width.interpolation ?? 'linear',
    stops: [...width.stops].sort((a, b) => a.offset - b.offset),
  };
};

const canonicalizeRibbonEndpoint = (
  endpoint: NonNullable<IRPathRibbonOptions['start']> | undefined,
): CanonicalRibbonEndpoint => ({ ...endpoint, cap: endpoint?.cap ?? 'butt' });

const canonicalizeRibbonSampling = (
  sampling: IRRibbonSampling | undefined,
  samples: IRPathRibbonOptions['samples'],
): CanonicalRibbonSampling | undefined => {
  if (sampling?.kind === 'adaptive') return { ...sampling, maxSamples: sampling.maxSamples ?? 512 };
  if (sampling !== undefined) return sampling;
  if (samples === true) return { kind: 'fixed', samples: 64 };
  if (typeof samples === 'number') return { kind: 'fixed', samples };
  return undefined;
};

const canonicalizeRibbon = (ribbon: IRPathRibbonOptions): CanonicalRibbonOptions => {
  const { samples, ...source } = ribbon;
  return {
    ...source,
    mode: ribbon.mode ?? 'centerline',
    align: ribbon.align ?? 'center',
    interpolation: ribbon.interpolation ?? 'linear',
    width: canonicalizeRibbonWidth(ribbon.width),
    start: canonicalizeRibbonEndpoint(ribbon.start),
    end: canonicalizeRibbonEndpoint(ribbon.end),
    sampling: canonicalizeRibbonSampling(ribbon.sampling, samples),
    upper: canonicalizeSteps(ribbon.upper),
    lower: canonicalizeSteps(ribbon.lower),
  };
};

const canonicalizePath = (path: IRPathBase): CanonicalPath => ({
  ...path,
  children: canonicalizeSteps(path.children),
  label:
    path.label === undefined
      ? undefined
      : (Array.isArray(path.label) ? path.label : [path.label]).map(canonicalizeLabel),
  ribbon: path.ribbon === undefined ? undefined : canonicalizeRibbon(path.ribbon),
  shadow: resolveDropShadow(path.shadow),
});

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
        previous = arcEndPoint(previous, step.radius, step.endAngle);
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
  const canonicalPath = canonicalizePath(styled);
  const irPath = context.irPath ?? 'path';
  const kind = resolvePathKind(canonicalPath, context, irPath);
  const targets = new Map<string, TargetResolution>();
  const scopeChain = context.scopeChain ?? [];
  const canonicalSteps =
    canonicalPath.children === undefined ? undefined : resolveSteps(canonicalPath.children, context, targets, irPath);
  const ribbon = canonicalPath.ribbon;
  const resolvedRibbon =
    ribbon === undefined
      ? undefined
      : {
          ...ribbon,
          ...(ribbon.upper === undefined
            ? {}
            : { upper: resolveSteps(ribbon.upper, context, targets, `${irPath}.ribbon.upper`) }),
          ...(ribbon.lower === undefined
            ? {}
            : { lower: resolveSteps(ribbon.lower, context, targets, `${irPath}.ribbon.lower`) }),
        };
  const resolvedPath: CanonicalPath = {
    ...canonicalPath,
    ...(canonicalSteps === undefined ? {} : { children: canonicalSteps }),
    ...(resolvedRibbon === undefined ? {} : { ribbon: resolvedRibbon }),
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
  };
};
