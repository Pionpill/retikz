import { describe, expect, it } from 'vitest';

import { normalizePlot, normalizePlotPathMark } from '../../../src';
import type { InputPlotPathMark } from '../../../src';

describe('Plain path construction', () => {
  it('normalizes way on plain Plot marks without retaining authoring fields', () => {
    const plot = normalizePlot({
      data: { reference: 'data' },
      scales: [],
      coordinate: { type: 'cartesian2D' },
      marks: [
        {
          type: 'path',
          way: [
            [0, 0],
            [10, 20],
          ],
          arrow: '<->',
          arrowDetail: { length: 7 },
          arrowPlacement: { overlap: 2 },
        },
      ],
    });
    expect(plot.marks[0]).toMatchObject({
      type: 'path',
      encodings: {
        steps: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [10, 20] },
        ],
      },
      properties: {
        marks: [
          { pos: 0, endpointOverlap: 2, mark: { kind: 'arrow', length: 7 } },
          { pos: 1, endpointOverlap: 2, mark: { kind: 'arrow', length: 7 } },
        ],
      },
    });
    expect(plot.marks[0]).not.toHaveProperty('way');
    expect(plot.marks[0]).not.toHaveProperty('arrow');
  });

  it('rejects vertex properties on constructed paths', () => {
    expect(() =>
      normalizePlotPathMark({
        way: [
          [0, 0],
          [1, 1],
        ],
        properties: { curve: 'linear' },
      }),
    ).toThrow(/curve/);
  });

  it('preserves relative shorthand and full source steps', () => {
    expect(normalizePlotPathMark({ way: ['A', '++2,3'] }).encodings.steps).toEqual([
      { kind: 'move', to: { id: 'A' } },
      { kind: 'line', to: { relativeAccumulate: [2, 3] } },
    ]);
    const source: InputPlotPathMark = {
      encodings: {
        steps: [
          { kind: 'move' as const, to: [0, 0] as [number, number] },
          { kind: 'smooth' as const, points: [[10, 20] as [number, number]] },
        ],
      },
    };
    expect(normalizePlotPathMark(source)).toEqual(source);
  });
});
