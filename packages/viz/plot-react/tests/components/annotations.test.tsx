import { MarkSchema } from '@retikz/plot';
import { normalizePlot } from '@retikz/plot-vanilla';
import type { InputPlotPointMark, InputPlotPathMark, InputPlotIntervalMark } from '@retikz/plot-vanilla';
import { describe, expect, it } from 'vitest';

import { buildPlotIR, PointMark, PathMark, IntervalMark } from '../../src';

describe('mark authoring parity', () => {
  it.each([false, true])('shares field, constant and edge positions with Vanilla (constant=%s)', constant => {
    const point: InputPlotPointMark = {
      contributeToDomain: false,
      encodings: { position: { x: constant ? { value: 5 } : { field: 'x' }, y: { value: 2 } } },
      properties: { text: 'target', fill: 'red' },
      transforms: [],
    };
    const path: InputPlotPathMark = {
      contributeToDomain: false,
      encodings: {
        from: { x: { edge: 'start' }, y: constant ? { value: 5 } : { field: 'y' } },
        to: { x: { value: 10 }, y: { value: 5 } },
      },
      properties: { stroke: 'blue', connection: 'straight' },
    };
    const interval: InputPlotIntervalMark = {
      contributeToDomain: false,
      encodings: {
        bounds: {
          x: { from: { value: 1 }, to: constant ? { value: 4 } : { field: 'x' } },
          y: { from: { value: 0 }, to: constant ? { value: 7 } : { field: 'y' } },
        },
      },
      properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'extent' } }, fill: 'green', connection: 'coordinate' },
    };
    const source = buildPlotIR(
      <>
        <PointMark {...point} />
        <PathMark {...path} />
        <IntervalMark {...interval} />
      </>,
      'data',
    );
    const vanilla = normalizePlot({
      scales: [],
      data: { reference: 'data' },
      marks: [
        { type: 'point', ...point },
        { type: 'path', ...path },
        { type: 'interval', ...interval },
      ],
    });
    expect(source.data.reference).toBe('data');
    expect(source.marks.map(mark => MarkSchema.parse(mark))).toEqual(vanilla.marks.map(mark => MarkSchema.parse(mark)));
    expect(source.marks[0]).toMatchObject({ transforms: [], encodings: point.encodings });
    expect(source.marks[1]).toMatchObject({ encodings: path.encodings });
    expect(source.marks[2]).toMatchObject({ encodings: interval.encodings });
  });
});
