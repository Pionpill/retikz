import { PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { createSmoothTrendSpec } from '../../../../plot/tests/helpers/plot-spec-fixtures';
import { buildPlotSpec } from '../../../src/components/build-plot-spec';
import { PathMark, PointMark } from '../../../src/components/marks';

describe('buildPlotSpec alpha.13 ADR-04（smooth transform 透传）', () => {
  it('smooth_declared_to_ir', () => {
    const spec = buildPlotSpec(
      <>
        <PointMark x="time" y="value" color="series" />
        <PathMark
          x="trendX"
          y="trendY"
          series="series"
          color="series"
          order="trendX"
          transform={[
            {
              kind: 'smooth',
              x: 'time',
              y: 'value',
              groupBy: ['series'],
              method: { kind: 'linear' },
              sampleCount: 64,
              xAs: 'trendX',
              yAs: 'trendY',
            },
          ]}
        />
      </>,
      '__plot',
    );
    const expected = createSmoothTrendSpec('__plot', {
      method: { kind: 'linear' },
      sampleCount: 64,
      scales: { x: '__x', y: '__y', color: '__color' },
    });

    expect(spec.marks[1]).toMatchObject(expected.marks[1]);
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });
});
