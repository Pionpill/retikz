import { PlotSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { createSmoothTrendSpec } from '../../../../plot/tests/helpers/plot-spec-fixtures';
import { buildPlotIR } from '../../../src/adapter';
import { PathMark, PointMark } from '../../../src/components/marks';

describe('buildPlotIR smooth transform forwarding', () => {
  it('smooth_declared_to_ir', () => {
    const spec = buildPlotIR(
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
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });
});
