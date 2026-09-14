import type { IRAxes } from '../../composites/presentation/axes';
import { AxesTickSourceKind } from '../../composites/presentation/axes/constants';
import { AxesSchema } from '../../composites/presentation/axes/schemas';
import {
  axesTickRangeOf,
  enumerateAxesTickValues,
  normalizeAxesExtent,
} from '../../composites/presentation/axes/schemas/utils';
import { getLatticeRangeError } from '../../composites/presentation/shared/lattice';
import { RetikzStandardError, RetikzStandardErrorCode } from '../../errors';
import type { CanonicalAxes, CanonicalAxesAxis } from './types';

/** 补全 Axes 的作者配置，保留 Source 缺省信息 */
export const resolveAxes = (source: IRAxes): CanonicalAxes => {
  const origin = AxesSchema.shape.origin.parse(source.origin);
  const label = origin.label;
  const labelSchema = AxesSchema.shape.origin.unwrap().shape.label.unwrap().options[2];
  return {
    ...source,
    x: resolveAxis(source.x, 'x'),
    y: resolveAxis(source.y, 'y'),
    origin: {
      ...origin,
      label:
        label === false
          ? false
          : typeof label === 'object' && !Array.isArray(label) && 'text' in label
            ? labelSchema.parse(label)
            : labelSchema.parse({ text: label }),
    },
  };
};

/** 在单轴上下文中确定标签、刻度及网格默认值 */
const resolveAxis = (source: IRAxes['x'], key: 'x' | 'y'): CanonicalAxesAxis => {
  const label = source.label ?? key;
  const axisSchema = AxesSchema.shape.x;
  const labelSchema = axisSchema.shape.label.unwrap().options[2];
  const ticks = axisSchema.shape.ticks.parse(source.ticks);
  const canonical: CanonicalAxesAxis = {
    ...source,
    extent: normalizeAxesExtent(source.extent),
    line: source.line === false ? false : axisSchema.shape.line.unwrap().options[1].parse(source.line ?? {}),
    label:
      label === false
        ? false
        : typeof label === 'object' && !Array.isArray(label) && 'text' in label
          ? labelSchema.parse(label)
          : labelSchema.parse({ text: label }),
    grid: axisSchema.shape.grid.parse(source.grid),
    ticks,
  };
  checkDefaultDependentValues(source, canonical, key);
  return canonical;
};

/** 仅检查 Source 阶段尚未具备完整参数的领域不变量 */
const checkDefaultDependentValues = (source: IRAxes['x'], axis: CanonicalAxesAxis, key: string): void => {
  const fail = (message: string, path: Array<string | number>): never => {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.ResolutionInvalid,
      message,
      details: { path: [key, ...path] },
    });
  };
  if (axis.grid && source.grid && source.grid.offset === undefined) {
    const error = getLatticeRangeError({
      min: -axis.extent.negative,
      max: axis.extent.positive,
      spacing: axis.grid.spacing,
      origin: axis.grid.offset,
      includeBoundary: false,
    });
    if (error !== undefined) fail(error, ['grid', 'spacing']);
  }
  if (!axis.ticks || !source.ticks) return;
  const ticks = axis.ticks;
  if (
    ticks.source.kind === AxesTickSourceKind.Spacing &&
    source.ticks.source.kind === AxesTickSourceKind.Spacing &&
    source.ticks.source.extent === undefined
  ) {
    const error = getLatticeRangeError({
      ...axesTickRangeOf(axis.extent, ticks.source.extent),
      spacing: ticks.source.spacing,
      origin: 0,
      includeBoundary: false,
    });
    if (error !== undefined) fail(error, ['ticks', 'source', 'spacing']);
  }
  if (
    ticks.labels &&
    (source.ticks.endpointGap === undefined ||
      (source.ticks.source.kind === AxesTickSourceKind.Spacing && source.ticks.source.extent === undefined))
  ) {
    const values = enumerateAxesTickValues(ticks.source, axis.extent, ticks.endpointGap);
    ticks.labels.entries.forEach((entry, index) => {
      if (
        !values.some(
          value =>
            Math.abs(value - entry.value) <= Number.EPSILON * Math.max(1, Math.abs(value), Math.abs(entry.value)) * 8,
        )
      ) {
        fail('Tick label values must refer to an emitted tick.', ['ticks', 'labels', 'entries', index, 'value']);
      }
    });
  }
};
