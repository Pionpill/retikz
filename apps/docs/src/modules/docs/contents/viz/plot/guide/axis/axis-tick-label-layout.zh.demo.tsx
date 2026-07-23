import type { FC } from 'react';

import { Axis, IntervalMark, Plot } from '@retikz/plot-react';

import { tickLabelLayoutRows } from './axis-tick-label-layout.data';

/** 长标签由 tickLabels.layout 尝试旋转，保留全部标签并把端点文字 flush 回轴范围。 */
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
    <Axis dimension="y" grid ticks={{ count: 5 }} title="收入" />
  </Plot>
);

export default Demo;
