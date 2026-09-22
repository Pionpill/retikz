import type { IRPath, IRTarget } from '@retikz/core';

import { shapePathProperties } from '../shared';
import type { IRRectangle } from './types';
/** 将 Rectangle 意图下沉为单一 Core Path */
export const lowerRectangle = (source: IRRectangle): IRPath => {
  let from: IRTarget;
  let to: IRTarget;
  if ('corner2' in source) {
    from = source.corner1;
    to = source.corner2;
  } else if ('center' in source) {
    const width = 'side' in source ? source.side : source.width;
    const height = 'side' in source ? source.side : source.height;
    from = [source.center[0] - width / 2, source.center[1] - height / 2];
    to = [source.center[0] + width / 2, source.center[1] + height / 2];
  } else {
    from = source.corner1;
    to = [from[0] + source.width, from[1] + source.height];
  }
  return {
    ...shapePathProperties(source),
    type: 'path',
    children: [
      { type: 'step', kind: 'move', to: from },
      {
        type: 'step',
        kind: 'rectangle',
        from,
        to,
        ...(source.cornerRadius === undefined ? {} : { cornerRadius: source.cornerRadius }),
      },
    ],
  };
};
