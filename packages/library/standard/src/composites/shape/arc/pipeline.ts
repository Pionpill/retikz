import type { IRPath } from '@retikz/core';

import { shapePathProperties, shapeAngles, ShapeArcCloseSchema } from '../shared';
import type { IRArc } from './types';
/** 将 Arc 意图下沉为单一 Core Path */
export const lowerArc = (source: IRArc): IRPath => {
  const angles = shapeAngles(source)!;
  const close = ShapeArcCloseSchema.parse(source.close);
  const { label: _hostLabel, ...properties } = shapePathProperties(source);
  void _hostLabel;
  const { label } = source;
  const arcLabel = label === undefined ? {} : { label };
  return {
    ...properties,
    type: 'path',
    children: [
      { type: 'step', kind: 'move', to: source.center },
      close === 'open'
        ? { type: 'step', kind: 'arc', center: source.center, radius: source.radius, ...angles, ...arcLabel }
        : typeof source.radius === 'number'
          ? { type: 'step', kind: 'circlePath', radius: source.radius, ...angles, closed: close, ...arcLabel }
          : { type: 'step', kind: 'ellipsePath', radius: source.radius, ...angles, closed: close, ...arcLabel },
    ],
  };
};
