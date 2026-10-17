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
          bounds={{
            x: { kind: 'extent', from: 'boxX0', to: 'boxX1' },
            y: { kind: 'extent', from: 'boxLow', to: 'boxHigh' },
          }}
          transform={[{ operation: boxplotSummary }]}
          x="boxX"
          y="boxHigh"
        />
        <RelationMark
          source={{ project: { x: 'boxX0', y: 'median' } }}
          target={{ project: { x: 'boxX1', y: 'median' } }}
          transform={[{ operation: boxplotSummary }]}
        />
        <RelationMark
          source={{ project: { x: 'boxX', y: 'whiskerMin' } }}
          target={{ project: { x: 'boxX', y: 'whiskerMax' } }}
          transform={[{ operation: boxplotSummary }]}
        />
        <PointMark transform={[{ operation: boxplotOutside }]} x="boxX" y="value" />
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
    expect(spec.marks[0]).toMatchObject({ type: 'interval', transform: [{ operation: boxplotSummary }] });
    expect(spec.marks[3]).toMatchObject({ type: 'point', transform: [{ operation: boxplotOutside }] });
    expect(JSON.stringify(spec)).not.toMatch(/BoxPlot|DensityPlot|RegressionPlot|boxplot/i);
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });
});
