import type { IRAxes } from '..';
import { RetikzStandardError, RetikzStandardErrorCode } from '../../../shared/errors';
import { getLatticeRangeError } from '../../shared/lattice';
import { AxesTickSourceKind } from '../constants';
import { AxesSchema } from '../schema';
import { axesTickRangeOf, enumerateAxesTickValues, resolveAxesExtent } from '../ticks';
import type { CanonicalAxes, CanonicalAxesAxis, CanonicalAxesTicks } from './types';

/** 补全 Axes 的作者配置，保留 Source 缺省信息 */
export const resolveAxes = (source: IRAxes): CanonicalAxes => {
  const originSchema = AxesSchema.shape.origin.unwrap().shape;
  const origin = {
    ...source.origin,
    position: source.origin?.position ?? originSchema.position.parse(undefined),
    label: source.origin?.label ?? originSchema.label.parse(undefined),
  };
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
            ? { ...label, offset: label.offset ?? labelSchema.shape.offset.parse(undefined) }
            : { text: label, offset: labelSchema.shape.offset.parse(undefined) },
    },
  };
};

/** 在单轴上下文中确定标签、刻度及网格默认值 */
const resolveAxis = (source: IRAxes['x'], key: 'x' | 'y'): CanonicalAxesAxis => {
  const label = source.label ?? key;
  const axisSchema = AxesSchema.shape.x;
  const labelSchema = axisSchema.shape.label.unwrap().options[2];
  const tickSchema = axisSchema.shape.ticks.unwrap().options[1].shape;
  const rawTicks = source.ticks;
  const ticks: CanonicalAxesTicks | false | undefined = rawTicks && {
    ...rawTicks,
    side: rawTicks.side ?? tickSchema.side.parse(undefined),
    length: rawTicks.length ?? tickSchema.length.parse(undefined),
    endpointGap: rawTicks.endpointGap ?? tickSchema.endpointGap.parse(undefined),
    source:
      rawTicks.source.kind === AxesTickSourceKind.Spacing
        ? {
            ...rawTicks.source,
            extent: rawTicks.source.extent ?? tickSchema.source.options[0].shape.extent.parse(undefined),
          }
        : rawTicks.source,
    labels: rawTicks.labels && {
      ...rawTicks.labels,
      offset: rawTicks.labels.offset ?? tickSchema.labels.unwrap().options[1].shape.offset.parse(undefined),
    },
  };
  const canonical: CanonicalAxesAxis = {
    ...source,
    extent: resolveAxesExtent(source.extent),
    line:
      source.line === false
        ? false
        : {
            ...source.line,
            arrows: source.line?.arrows ?? axisSchema.shape.line.unwrap().options[1].shape.arrows.parse(undefined),
          },
    label:
      label === false
        ? false
        : typeof label === 'object' && !Array.isArray(label) && 'text' in label
          ? {
              ...label,
              end: label.end ?? labelSchema.shape.end.parse(undefined),
              offset: label.offset ?? labelSchema.shape.offset.parse(undefined),
            }
          : {
              text: label,
              end: labelSchema.shape.end.parse(undefined),
              offset: labelSchema.shape.offset.parse(undefined),
            },
    grid: source.grid && {
      ...source.grid,
      offset: source.grid.offset ?? axisSchema.shape.grid.unwrap().options[1].shape.offset.parse(undefined),
    },
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
