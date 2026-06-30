import type { Transform as PlotTransformOperation } from '@retikz/plot';

import { isBuiltinMark, PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotSpec } from '../../../src/components/build-plot-spec';
import { IntervalMark, PointMark, ReferenceMark } from '../../../src/components/marks';

describe('buildPlotSpec alpha.13 ADR-05（stat-geom 结构组合）', () => {
  const boxSummary: PlotTransformOperation = {
    kind: 'summarize',
    groupBy: ['group', 'boxX', 'boxX0', 'boxX1'],
    metrics: [
      {
        op: 'quantile-band',
        field: 'value',
        lowerP: 0.25,
        upperP: 0.75,
        outputs: {
          lower: 'boxLow',
          upper: 'boxHigh',
          points: [{ p: 0.5, as: 'median' }],
          whiskerMin: 'whiskerMin',
          whiskerMax: 'whiskerMax',
        },
        whisker: { kind: 'spread', factor: 1.5 },
      },
    ],
  };

  const boxOutside: PlotTransformOperation = {
    kind: 'select',
    groupBy: ['group'],
    selector: {
      op: 'outside-quantile-band',
      field: 'value',
      lowerP: 0.25,
      upperP: 0.75,
      boundary: { kind: 'spread', factor: 1.5 },
    },
  };

  it('boxplot composition uses existing marks and mark-local transforms', () => {
    const spec = buildPlotSpec(
      <>
        <IntervalMark
          bounds={{
            x: { kind: 'extent', from: 'boxX0', to: 'boxX1' },
            y: { kind: 'extent', from: 'boxLow', to: 'boxHigh' },
          }}
          transform={[boxSummary]}
          x="boxX"
          y="boxHigh"
        />
        <ReferenceMark extentField="boxX0" extentToField="boxX1" transform={[boxSummary]} y="median" />
        <ReferenceMark extentField="whiskerMin" extentToField="whiskerMax" transform={[boxSummary]} x="boxX" />
        <PointMark transform={[boxOutside]} x="boxX" y="value" />
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
    expect(spec.marks[0]).toMatchObject({ type: 'interval', transform: [boxSummary] });
    expect(spec.marks[3]).toMatchObject({ type: 'point', transform: [boxOutside] });
    expect(JSON.stringify(spec)).not.toMatch(/BoxPlot|DensityPlot|RegressionPlot|boxplot/i);
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });
});
