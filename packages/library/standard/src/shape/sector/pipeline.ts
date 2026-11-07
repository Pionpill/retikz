import type { IRPath } from '@retikz/core';
import { pointAtEllipseArcAngle } from '@retikz/math';

import { shapePathProperties, shapeAngles } from '../shared';
import type { IRSector } from './types';

/** 将 Sector 意图下沉为单一 Core Path */
export const lowerSector = (source: IRSector): IRPath => {
  const { startAngle, endAngle } = shapeAngles(source)!;
  const { label: _hostLabel, ...properties } = shapePathProperties(source);
  void _hostLabel;

  const { label, innerRadius: inner, radius: sourceRadius, center: sourceCenter } = source;
  const arcLabel = label === undefined ? {} : { label };

  if (inner === undefined || inner === 0 || (typeof inner === 'object' && inner.x === 0))
    return {
      ...properties,
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: sourceCenter },
        typeof sourceRadius === 'number'
          ? {
              type: 'step',
              kind: 'circlePath',
              radius: sourceRadius,
              startAngle,
              endAngle,
              closed: 'sector',
              ...arcLabel,
            }
          : {
              type: 'step',
              kind: 'ellipsePath',
              radius: sourceRadius,
              startAngle,
              endAngle,
              closed: 'sector',
              ...arcLabel,
            },
      ],
    };

  // 正内半径的 schema 分支只接受字面笛卡尔中心
  const center = sourceCenter as [number, number];
  const radius = sourceRadius;
  const outerStart = pointAtEllipseArcAngle({
    center,
    radiusX: typeof radius === 'number' ? radius : radius.x,
    radiusY: typeof radius === 'number' ? radius : radius.y,
    angleDeg: startAngle,
  });
  const innerEnd = pointAtEllipseArcAngle({
    center,
    radiusX: typeof inner === 'number' ? inner : inner.x,
    radiusY: typeof inner === 'number' ? inner : inner.y,
    angleDeg: endAngle,
  });

  return {
    ...properties,
    type: 'path',
    children: [
      { type: 'step', kind: 'move', to: outerStart },
      { type: 'step', kind: 'arc', center, radius, startAngle, endAngle, ...arcLabel },
      { type: 'step', kind: 'line', to: innerEnd },
      { type: 'step', kind: 'arc', center, radius: inner, startAngle: endAngle, endAngle: startAngle },
      { type: 'step', kind: 'line', to: outerStart },
    ],
  };
};
