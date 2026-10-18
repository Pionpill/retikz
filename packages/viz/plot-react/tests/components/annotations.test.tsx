import { AnnotationSchema } from '@retikz/plot';
import { pointAnnotation, pathAnnotation, intervalAnnotation } from '@retikz/plot-vanilla';
import { describe, expect, it } from 'vitest';

import { buildPlotIR, PointAnnotation, PathAnnotation, IntervalAnnotation } from '../../src';

describe('annotation authoring parity', () => {
  it('normalizes React and Vanilla constants to identical Source declarations', () => {
    const source = buildPlotIR(
      <>
        <PointAnnotation x={5} y={6} text="target" fill="red" />
        <PathAnnotation from={{ x: 0, y: 5 }} to={{ x: 10, y: 5 }} stroke="blue" connection="straight" />
        <IntervalAnnotation x={{ from: 2, to: 4 }} y={{ from: 3, to: 7 }} fill="green" connection="coordinate" />
      </>,
      'data',
    );
    const vanilla = [
      pointAnnotation({ x: 5, y: 6, text: 'target', fill: 'red' }),
      pathAnnotation({ from: { x: 0, y: 5 }, to: { x: 10, y: 5 }, stroke: 'blue', connection: 'straight' }),
      intervalAnnotation({ x: { from: 2, to: 4 }, y: { from: 3, to: 7 }, fill: 'green', connection: 'coordinate' }),
    ];
    expect(source.data.reference).toBe('data');
    expect(source.marks.map(mark => AnnotationSchema.parse(mark))).toEqual(
      vanilla.map(mark => AnnotationSchema.parse(mark)),
    );
  });
});
