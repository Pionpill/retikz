import { isBuiltinMark, PlotSchema } from '@retikz/plot';
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
            position: { x: 'boxX', y: 'boxHigh' },
            bounds: { x: { from: 'boxX0', to: 'boxX1' }, y: { from: 'boxLow', to: 'boxHigh' } },
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
            source: { position: { x: 'boxX0', y: 'median' } },
            target: { position: { x: 'boxX1', y: 'median' } },
          }}
        />
        <RelationMark
          properties={{ geometry: { kind: 'path' } }}
          transforms={[{ operation: boxplotSummary }]}
          encodings={{
            source: { position: { x: 'boxX', y: 'whiskerMin' } },
            target: { position: { x: 'boxX', y: 'whiskerMax' } },
          }}
        />
        <PointMark transforms={[{ operation: boxplotOutside }]} encodings={{ position: { x: 'boxX', y: 'value' } }} />
      </>,
      '__plot',
      { deferPositionScaleInference: true },
    );

    expect(spec.marks.map(mark => (isBuiltinMark(mark) ? mark.type : 'custom'))).toEqual([
      'interval',
      'relation',
      'relation',
      'point',
    ]);
    expect(spec.marks[0]).toMatchObject({
      type: 'interval',
      transforms: [{ operation: boxplotSummary }],
      kind: 'data',
    });
    expect(spec.marks[3]).toMatchObject({ type: 'point', transforms: [{ operation: boxplotOutside }], kind: 'data' });
    expect(JSON.stringify(spec)).not.toMatch(/BoxPlot|DensityPlot|RegressionPlot|boxplot/i);
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });
});
