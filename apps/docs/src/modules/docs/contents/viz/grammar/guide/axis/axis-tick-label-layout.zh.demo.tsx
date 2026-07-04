import type { FC } from 'react';

import { Axis, IntervalMark, Plot } from '@retikz/plot-react';

import { tickLabelLayoutRows } from './axis-tick-label-layout.data';

/** 长标签默认由 tickLabels.layout 先尝试旋转，再按 greedy 策略隐藏重叠标签。 */
const Demo: FC = () => (
  <Plot data={tickLabelLayoutRows} width={360} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
    <IntervalMark x="month" y="value" color="#2563eb" />
    <Axis
      dimension="x"
      tickLabels={{
        layout: {
          rotate: { angles: [0, -45, -90] },
          hide: { strategy: 'greedy', preserveEnds: true, separation: 2 },
          bounds: { overflow: 'flush' },
        },
      }}
    />
    <Axis dimension="y" grid ticks={{ count: 5 }} title="收入" />
  </Plot>
);

export default Demo;
