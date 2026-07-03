import { isBuiltinMark, PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { boxplotOutside, boxplotSummary } from '../../../../plot/tests/helpers/plot-spec-fixtures';
import { buildPlotSpec } from '../../../src/components/build-plot-spec';
import { IntervalMark, PointMark, ReferenceMark } from '../../../src/components/marks';

describe('buildPlotSpec stat-geom 结构组合', () => {
  it('boxplot composition uses existing marks and mark-local transforms', () => {
    const spec = buildPlotSpec(
      <>
        <IntervalMark
          bounds={{
            x: { kind: 'extent', from: 'boxX0', to: 'boxX1' },
            y: { kind: 'extent', from: 'boxLow', to: 'boxHigh' },
          }}
          transform={[boxplotSummary]}
          x="boxX"
          y="boxHigh"
        />
        <ReferenceMark extentField="boxX0" extentToField="boxX1" transform={[boxplotSummary]} y="median" />
        <ReferenceMark extentField="whiskerMin" extentToField="whiskerMax" transform={[boxplotSummary]} x="boxX" />
        <PointMark transform={[boxplotOutside]} x="boxX" y="value" />
      </>,
      '__plot',
      { deferPositionScaleInference: true },
    );

    expect(spec.marks.map(mark => (isBuiltinMark(mark) ? mark.type : 'custom'))).toEqual([
      'interval',
      'reference',
      'reference',
      'point',
    ]);
    expect(spec.marks[0]).toMatchObject({ type: 'interval', transform: [boxplotSummary] });
    expect(spec.marks[3]).toMatchObject({ type: 'point', transform: [boxplotOutside] });
    expect(JSON.stringify(spec)).not.toMatch(/BoxPlot|DensityPlot|RegressionPlot|boxplot/i);
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });
});
