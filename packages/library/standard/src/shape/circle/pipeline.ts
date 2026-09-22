import type { IRPath, IRTarget } from '@retikz/core';

import { ShapeClosedSchema, ShapeFitSchema, shapeAngles, shapeBoxGeometry, shapePathProperties } from '../shared';
import type { IRCircle } from './types';

/** 将圆形意图下沉为单一 Core Path */
export const lowerCircle = (source: IRCircle): IRPath => {
  let center: IRTarget;
  let radius: number;
  if ('radius' in source) {
    center = source.center;
    radius = source.radius;
  } else if ('diameter' in source) {
    center = source.center;
    radius = source.diameter / 2;
  } else if ('from' in source) {
    center = [(source.from[0] + source.to[0]) / 2, (source.from[1] + source.to[1]) / 2];
    radius = Math.hypot(source.to[0] - source.from[0], source.to[1] - source.from[1]) / 2;
  } else {
    const box = shapeBoxGeometry(source);
    center = box.center;
    radius =
      (ShapeFitSchema.parse(source.fit) === 'cover'
        ? Math.max(box.width, box.height)
        : Math.min(box.width, box.height)) / 2;
  }
  const angles = shapeAngles(source);
  return {
    ...shapePathProperties(source),
    type: 'path',
    children: [
      { type: 'step', kind: 'move', to: center },
      {
        type: 'step',
        kind: 'circlePath',
        radius,
        ...(angles ? { ...angles, closed: ShapeClosedSchema.parse(source.closed) } : {}),
      },
    ],
  };
};
