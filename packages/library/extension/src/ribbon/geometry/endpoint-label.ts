import type { PathKindBoundaryLabelInput } from '@retikz/core';
import { curve } from '@retikz/math';

import { RetikzExtensionError, RetikzExtensionErrorCode } from '../../errors';
import type { CanonicalRibbonEndpoint } from '../types';
import type { RibbonEndpointGeometry } from './caps';
import { commandsToSegmentInputs, segmentInputToCurve } from './centerline';

/** 从最终端帽曲线的外向极值推导 Kernel 标签请求 */
export const endpointLabelInput = (
  endpoint: 'start' | 'end',
  config: CanonicalRibbonEndpoint,
  geometry: RibbonEndpointGeometry,
): Array<PathKindBoundaryLabelInput> => {
  if (config.label === undefined) return [];
  const { center, outward, commands } = geometry;
  const projections = commandsToSegmentInputs(commands, `${endpoint}.cap`).map(
    input => curve.projectedRange(segmentInputToCurve(input), outward).max,
  );
  // 零宽端帽仍包含起点；曲线转换可丢弃退化段
  const first = commands[0];
  if (first.kind === 'move') projections.push(first.to[0] * outward[0] + first.to[1] * outward[1]);
  const h = Math.max(...projections) - center[0] * outward[0] - center[1] * outward[1];
  if (!Number.isFinite(h))
    throw new RetikzExtensionError({
      code: RetikzExtensionErrorCode.GeometryInvalid,
      message: `Ribbon ${endpoint}.label has no finite cap support.`,
      details: { endpoint, path: `${endpoint}.label` },
    });
  return [
    {
      label: config.label,
      point: [center[0] + h * outward[0], center[1] + h * outward[1]],
      outward,
      sourcePath: `kindOptions.${endpoint}.label`,
    },
  ];
};
