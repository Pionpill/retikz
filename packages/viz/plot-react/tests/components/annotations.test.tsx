import { AnnotationSchema } from '@retikz/plot';
import { pointAnnotation, pathAnnotation, intervalAnnotation } from '@retikz/plot-vanilla';
import { describe, expect, it } from 'vitest';

import { buildPlotIR, PointAnnotation, PathAnnotation, IntervalAnnotation } from '../../src';

describe('annotation authoring parity', () => {
  it('shares field bindings, constant normalization and explicit empty transforms with Vanilla', () => {
    const source = buildPlotIR(
      <>
        <PointAnnotation encodings={{ position: { x: 'x' } }} properties={{ position: { y: 2 } }} transforms={[]} />
        <PathAnnotation
          encodings={{ from: { y: 'y' }, to: { y: 'y' } }}
          properties={{ from: { x: { edge: 'start' } }, to: { x: 10 } }}
        />
        <IntervalAnnotation
          encodings={{ bounds: { x: { to: 'x' }, y: { to: 'y' } } }}
          properties={{ bounds: { x: { from: 1 }, y: { from: 0 } } }}
        />
      </>,
      'data',
    );
    const vanilla = [
      pointAnnotation({ encodings: { position: { x: 'x' } }, properties: { position: { y: 2 } }, transforms: [] }),
      pathAnnotation({
        encodings: { from: { y: 'y' }, to: { y: 'y' } },
        properties: { from: { x: { edge: 'start' } }, to: { x: 10 } },
      }),
      intervalAnnotation({
        encodings: { bounds: { x: { to: 'x' }, y: { to: 'y' } } },
        properties: { bounds: { x: { from: 1 }, y: { from: 0 } } },
      }),
    ];
    expect(source.marks.map(mark => AnnotationSchema.parse(mark))).toEqual(
      vanilla.map(mark => AnnotationSchema.parse(mark)),
    );
    expect(vanilla[0]).toMatchObject({
      encodings: { position: { x: 'x' } },
      properties: { position: { y: 2 } },
      transforms: [],
    });
    expect(vanilla[1]).toMatchObject({ properties: { to: { x: 10 } } });
    expect(vanilla[2]).toMatchObject({ properties: { bounds: { x: { from: 1 } } } });
  });
  it('normalizes React and Vanilla constants to identical Source declarations', () => {
    const source = buildPlotIR(
      <>
        <PointAnnotation properties={{ position: { x: 5, y: 6 }, text: 'target', fill: 'red' }} />
        <PathAnnotation
          properties={{ from: { x: 0, y: 5 }, to: { x: 10, y: 5 }, stroke: 'blue', connection: 'straight' }}
        />
        <IntervalAnnotation
          properties={{
            bounds: { x: { from: 2, to: 4 }, y: { from: 3, to: 7 } },
            fill: 'green',
            connection: 'coordinate',
          }}
        />
      </>,
      'data',
    );
    const vanilla = [
      pointAnnotation({ properties: { position: { x: 5, y: 6 }, text: 'target', fill: 'red' } }),
      pathAnnotation({
        properties: { from: { x: 0, y: 5 }, to: { x: 10, y: 5 }, stroke: 'blue', connection: 'straight' },
      }),
      intervalAnnotation({
        properties: {
          bounds: { x: { from: 2, to: 4 }, y: { from: 3, to: 7 } },
          fill: 'green',
          connection: 'coordinate',
        },
      }),
    ];
    expect(source.data.reference).toBe('data');
    expect(source.marks.map(mark => AnnotationSchema.parse(mark))).toEqual(
      vanilla.map(mark => AnnotationSchema.parse(mark)),
    );
  });
});
