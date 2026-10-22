import { PlotSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { boxplotOutside, boxplotSummary } from '../../../../plot/tests/helpers/plot-spec-fixtures';
import { buildPlotIR } from '../../../src/adapter';
import { IntervalMark, PointMark, RelationMark } from '../../../src/components/marks';

describe('buildPlotIR stat-geom 结构组合', () => {
  it('boxplot composition uses existing marks and mark-local transforms', () => {
    const spec = buildPlotIR(
      <>
        <IntervalMark
          transforms={[{ operation: boxplotSummary }]}
          encodings={{
            position: { x: { field: 'boxX' }, y: { field: 'boxHigh' } },
            bounds: {
              x: { from: { field: 'boxX0' }, to: { field: 'boxX1' } },
              y: { from: { field: 'boxLow' }, to: { field: 'boxHigh' } },
            },
          }}
          properties={{
            bounds: {
              x: { kind: 'extent' },
              y: { kind: 'extent' },
            },
          }}
        />
        <RelationMark
          properties={{ geometry: { kind: 'path' } }}
          transforms={[{ operation: boxplotSummary }]}
          encodings={{
            source: { position: { x: { field: 'boxX0' }, y: { field: 'median' } } },
            target: { position: { x: { field: 'boxX1' }, y: { field: 'median' } } },
          }}
        />
        <RelationMark
          properties={{ geometry: { kind: 'path' } }}
          transforms={[{ operation: boxplotSummary }]}
          encodings={{
            source: { position: { x: { field: 'boxX' }, y: { field: 'whiskerMin' } } },
            target: { position: { x: { field: 'boxX' }, y: { field: 'whiskerMax' } } },
          }}
        />
        <PointMark
          transforms={[{ operation: boxplotOutside }]}
          encodings={{ position: { x: { field: 'boxX' }, y: { field: 'value' } } }}
        />
      </>,
      '__plot',
      { deferPositionScaleInference: true },
    );

    expect(spec.marks.map(mark => mark.type)).toEqual(['interval', 'relation', 'relation', 'point']);
    expect(spec.marks[0]).toMatchObject({
      type: 'interval',
      transforms: [{ operation: boxplotSummary }],
    });
    expect(spec.marks[3]).toMatchObject({ type: 'point', transforms: [{ operation: boxplotOutside }] });
    expect(JSON.stringify(spec)).not.toMatch(/BoxPlot|DensityPlot|RegressionPlot|boxplot/i);
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });
});
