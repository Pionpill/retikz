import type {
  IRGeometryLabel,
  IRPathBase,
  IRPathRibbonOptions,
  IRRibbonSampling,
  IRRibbonWidth,
  IRStep,
} from '../../schemas';
import type {
  CanonicalGeometryLabel,
  CanonicalPath,
  CanonicalRibbonEndpoint,
  CanonicalRibbonOptions,
  CanonicalRibbonSampling,
  CanonicalRibbonWidth,
  CanonicalStep,
} from './types';

import { normalizeShadow } from '../shadow';

const LABEL_POSITION: Record<string, number> = {
  'at-start': 0,
  'very-near-start': 0.125,
  'near-start': 0.25,
  midway: 0.5,
  'near-end': 0.75,
  'very-near-end': 0.875,
  'at-end': 1,
};

/** 展开路径几何标签的静态位置与方向默认值 */
const normalizeLabel = (label: IRGeometryLabel): CanonicalGeometryLabel => ({
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

/** 展开单个路径步骤的静态默认值 */
const normalizeStep = (step: IRStep): CanonicalStep => {
  if (step.kind === 'move' || step.kind === 'cycle' || step.kind === 'rectangle') return step;
  const label = step.label === undefined ? undefined : normalizeLabel(step.label);
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

/** 递归展开路径步骤数组 */
const normalizeSteps = (steps: ReadonlyArray<IRStep> | undefined): Array<CanonicalStep> | undefined =>
  steps?.map(normalizeStep);

/** 排序宽度停靠点并补齐其插值方式 */
const normalizeRibbonWidth = (width: IRRibbonWidth | undefined): CanonicalRibbonWidth | undefined => {
  if (width === undefined || typeof width === 'number' || width.kind === 'profile') return width;
  return {
    ...width,
    interpolation: width.interpolation ?? 'linear',
    stops: [...width.stops].sort((a, b) => a.offset - b.offset),
  };
};

/** 补齐流带端点的端帽 */
const normalizeRibbonEndpoint = (
  endpoint: NonNullable<IRPathRibbonOptions['start']> | undefined,
): CanonicalRibbonEndpoint => ({ ...endpoint, cap: endpoint?.cap ?? 'butt' });

/** 把流带采样简写展开为统一策略 */
const normalizeRibbonSampling = (
  sampling: IRRibbonSampling | undefined,
  samples: IRPathRibbonOptions['samples'],
): CanonicalRibbonSampling | undefined => {
  if (sampling?.kind === 'adaptive') return { ...sampling, maxSamples: sampling.maxSamples ?? 512 };
  if (sampling !== undefined) return sampling;
  if (samples === true) return { kind: 'fixed', samples: 64 };
  if (typeof samples === 'number') return { kind: 'fixed', samples };
  return undefined;
};

/** 展开流带的静态默认值与嵌套路径步骤 */
const normalizeRibbon = (ribbon: IRPathRibbonOptions): CanonicalRibbonOptions => {
  const { samples, ...source } = ribbon;
  return {
    ...source,
    mode: ribbon.mode ?? 'centerline',
    align: ribbon.align ?? 'center',
    interpolation: ribbon.interpolation ?? 'linear',
    width: normalizeRibbonWidth(ribbon.width),
    start: normalizeRibbonEndpoint(ribbon.start),
    end: normalizeRibbonEndpoint(ribbon.end),
    sampling: normalizeRibbonSampling(ribbon.sampling, samples),
    upper: normalizeSteps(ribbon.upper),
    lower: normalizeSteps(ribbon.lower),
  };
};

/** 将源 IR 路径展开为内置输出器消费的规范化路径 */
export const normalizePath = (path: IRPathBase): CanonicalPath => ({
  ...path,
  children: normalizeSteps(path.children),
  label:
    path.label === undefined ? undefined : (Array.isArray(path.label) ? path.label : [path.label]).map(normalizeLabel),
  ribbon: path.ribbon === undefined ? undefined : normalizeRibbon(path.ribbon),
  shadow: normalizeShadow(path.shadow),
});
