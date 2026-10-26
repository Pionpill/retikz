import { AxisLineTargetSchema, DrawWay, parseTargetSugar, parseWayWithTargets } from '@retikz/core';
import type { IRPlotPathMark, IRPlotPathStep } from '@retikz/plot';
import { normalizePathMarks } from '@retikz/vanilla';

import { RetikzPlotVanillaError } from '../../error';
import type { InputPlotPathMark } from './input-marks';

/** 将路径作者简写统一归一为持久化步骤与路径标记 */
export const normalizePlotPathMark = (input: InputPlotPathMark): Omit<IRPlotPathMark, 'type'> => {
  const {
    way,
    children,
    arrow,
    arrowDetail,
    arrowPlacement,
    encodings,
    properties,
    resolveLabel: _resolveLabel,
    ...rest
  } = input;
  if (
    properties?.kind === 'ribbon' &&
    (arrow !== undefined || arrowDetail !== undefined || arrowPlacement !== undefined)
  )
    throw new RetikzPlotVanillaError('Ribbon paths cannot use arrow shorthand');
  const hasSourceGeometry =
    encodings !== undefined && ['steps', 'position', 'from', 'to'].some(key => key in encodings);
  if (Number(way !== undefined) + Number(children !== undefined) + Number(hasSourceGeometry) !== 1)
    throw new RetikzPlotVanillaError('Path requires exactly one of way, children, steps, position, or from/to');
  if (way !== undefined || children !== undefined || encodings.steps !== undefined) {
    for (const field of ['curve', 'closure', 'closed', 'connectNulls', 'interpolation', 'connection'] as const) {
      if (properties?.[field] !== undefined) throw new RetikzPlotVanillaError(`Explicit steps cannot use ${field}`);
    }
  }
  let steps: Array<IRPlotPathStep> | undefined = children;
  try {
    if (way !== undefined)
      steps = parseWayWithTargets(way, {
        target: value => {
          if (typeof value === 'string') return parseTargetSugar(value);
          if ('type' in value && 'position' in value)
            return value.type === DrawWay.Accumulate
              ? { relativeAccumulate: value.position }
              : { relative: value.position };
          return value;
        },
        control: value => value,
        axisTarget: value => {
          if (typeof value !== 'string') return value;
          return AxisLineTargetSchema.parse(parseTargetSugar(value));
        },
      }).map(({ type: _type, ...step }) => step);
    const marks = normalizePathMarks({ arrow, arrowDetail, arrowPlacement, marks: properties?.marks });
    return {
      ...rest,
      encodings: (steps === undefined ? encodings : { ...encodings, steps }) as IRPlotPathMark['encodings'],
      ...(properties === undefined && marks === undefined
        ? {}
        : { properties: { ...properties, ...(marks === undefined ? {} : { marks }) } }),
    };
  } catch (cause) {
    throw new RetikzPlotVanillaError('Unable to normalize Plot path construction', { cause });
  }
};
