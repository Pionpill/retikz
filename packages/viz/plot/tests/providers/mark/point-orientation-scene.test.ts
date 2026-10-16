import { compileToScene } from '@retikz/core';
import { expect, it } from 'vitest';

import { lowerPlots } from '../../../src/pipeline/expand';
import { PlotSchema } from '../../../src/schemas';

it('coordinate alignment shares rotated node geometry, connection endpoints and provenance', () => {
  const compile = (aligned: boolean) => {
    const spec = PlotSchema.parse({
      type: 'plot',
      namespace: 'plot',
      id: 'oriented',
      data: { reference: 'd' },
      coordinate: { type: 'polar2D', angle: 'x', radius: 'y', startAngle: 0, endAngle: 360 },
      scales: [
        { type: 'linear', name: 'x', domain: [0, 360], range: [0, 360] },
        { type: 'linear', name: 'y', domain: [0, 100], range: [0, 100] },
      ],
      marks: [
        {
          type: 'point',
          id: 'points',
          autoPadding: false,
          encoding: { x: { field: 'angle' }, y: { field: 'radius' } },
          anchorId: { prefix: 'point', field: 'name' },
          shape: { kind: 'constant', value: 'rectangle' },
          minimumSize: { kind: 'constant', value: { width: 40, height: 10 } },
          rotate: { kind: 'constant', value: aligned ? 15 : 105 },
          ...(aligned ? { orientation: { kind: 'coordinate', role: 'y', align: 'tangent' } } : {}),
        },
        {
          type: 'relation',
          source: { anchorId: { prefix: 'point', field: 'name' } },
          target: { anchorId: { prefix: 'point', field: 'next' } },
        },
      ],
      guides: [],
    });
    return compileToScene(
      { version: 1, type: 'scene', children: [spec] },
      {
        composites: lowerPlots(
          {
            d: [
              { angle: 90, radius: 30, name: 'a', next: 'b' },
              { angle: 90, radius: 80, name: 'b', next: 'a' },
            ],
          },
          { layout: { width: 300, height: 300 }, provenance: true, datumProvenance: true },
        ),
      },
    ).scene;
  };
  expect(compile(true)).toEqual(compile(false));
});
