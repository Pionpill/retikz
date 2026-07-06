import type { FC } from 'react';

import { Axis, IntervalMark, Plot } from '@retikz/plot-react';

import { tickLabelLayoutRows } from './axis-tick-label-layout.data';

/** Long labels use tickLabels.layout to rotate, keep all labels, and flush endpoint text back into the axis span. */
const Demo: FC = () => (
  <Plot data={tickLabelLayoutRows} width={360} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
    <IntervalMark x="month" y="value" color="#2563eb" />
    <Axis
      dimension="x"
      tickLabels={{
        layout: {
          rotate: { angles: [0, -45, -90] },
          hide: false,
          bounds: { overflow: 'flush' },
        },
      }}
    />
    <Axis dimension="y" grid ticks={{ count: 5 }} title="Revenue" />
  </Plot>
);

export default Demo;
