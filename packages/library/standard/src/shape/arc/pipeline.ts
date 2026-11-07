import type { IRPath } from '@retikz/core';

import { shapePathProperties, shapeAngles, ShapeArcCloseSchema } from '../shared';
import type { IRArc } from './types';

/** 将 Arc 意图下沉为单一 Core Path */
export const lowerArc = (source: IRArc): IRPath => {
  const angles = shapeAngles(source)!;
  const close = source.close ?? ShapeArcCloseSchema.parse(undefined);
  const { label: _hostLabel, ...properties } = shapePathProperties(source);
  void _hostLabel;
  const { label, center, radius } = source;
  const arcLabel = label === undefined ? {} : { label };

  return {
    ...properties,
    type: 'path',
    children: [
      { type: 'step', kind: 'move', to: center },
      close === 'open'
        ? { type: 'step', kind: 'arc', center, radius, ...angles, ...arcLabel }
        : typeof radius === 'number'
          ? { type: 'step', kind: 'circlePath', radius, ...angles, closed: close, ...arcLabel }
          : { type: 'step', kind: 'ellipsePath', radius, ...angles, closed: close, ...arcLabel },
    ],
  };
};
