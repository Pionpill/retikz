import type { IRPath, IRTarget } from '@retikz/core';

import { shapePathProperties, shapeAngles, shapeBoxGeometry, ShapeClosedSchema } from '../shared';
import type { IREllipse } from './types';
/** 将 Ellipse 意图下沉为单一 Core Path */
export const lowerEllipse = (source: IREllipse): IRPath => {
  let center: IRTarget;
  let radius: { x: number; y: number };
  if ('radius' in source) {
    center = source.center;
    radius = source.radius;
  } else if ('diameterX' in source) {
    center = source.center;
    radius = { x: source.diameterX / 2, y: source.diameterY / 2 };
  } else {
    const box = shapeBoxGeometry(source);
    center = box.center;
    radius = { x: box.width / 2, y: box.height / 2 };
  }
  const angles = shapeAngles(source);
  return {
    ...shapePathProperties(source),
    type: 'path',
    children: [
      { type: 'step', kind: 'move', to: center },
      {
        type: 'step',
        kind: 'ellipsePath',
        radius,
        ...(angles ? { ...angles, closed: ShapeClosedSchema.parse(source.closed) } : {}),
      },
    ],
  };
};
