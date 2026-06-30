import { PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

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

    expect(spec.marks[1]).toMatchObject({
      type: 'path',
      series: 'series',
      order: 'trendX',
      transform: [
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
      ],
      encoding: { x: { field: 'trendX' }, y: { field: 'trendY' }, color: { field: 'series', scale: '__color' } },
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });
});
