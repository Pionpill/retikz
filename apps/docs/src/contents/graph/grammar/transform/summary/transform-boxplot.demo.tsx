import type { FC } from 'react';

import { Axis, IntervalMark, Plot, PointMark, ReferenceMark } from '@retikz/plot-react';

import { boxplotSamples } from './transform-boxplot.data';

const boxSummary = {
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
} as const;

const outsideBoxRows = {
  kind: 'select',
  groupBy: ['group'],
  selector: {
    op: 'outside-quantile-band',
    field: 'value',
    lowerP: 0.25,
    upperP: 0.75,
    boundary: { kind: 'spread', factor: 1.5 },
  },
} as const;

const Demo: FC = () => (
  <Plot data={boxplotSamples} height={260} style={{ maxWidth: '100%', height: 'auto' }} width={440}>
    <Axis dimension="x" />
    <Axis dimension="y" grid />
    <IntervalMark
      bounds={{
        x: { kind: 'extent', from: 'boxX0', to: 'boxX1' },
        y: { kind: 'extent', from: 'boxLow', to: 'boxHigh' },
      }}
      fill="#93c5fd"
      fillOpacity={0.32}
      stroke="#2563eb"
      strokeWidth={1.4}
      transform={[boxSummary]}
      x="boxX"
      y="boxHigh"
    />
    <ReferenceMark
      color="#1d4ed8"
      extentField="boxX0"
      extentToField="boxX1"
      strokeWidth={2}
      transform={[boxSummary]}
      y="median"
    />
    <ReferenceMark
      color="#475569"
      extentField="whiskerMin"
      extentToField="whiskerMax"
      strokeWidth={1.2}
      transform={[boxSummary]}
      x="boxX"
    />
    <PointMark fill="#0f172a" opacity={0.82} size={18} transform={[outsideBoxRows]} x="boxX" y="value" />
  </Plot>
);

export default Demo;
