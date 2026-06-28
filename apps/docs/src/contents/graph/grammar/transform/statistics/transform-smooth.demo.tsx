import { Axis, PathMark, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { trendSamples } from './transform-smooth.data';

const Demo: FC = () => (
  <Plot data={trendSamples} height={260} style={{ maxWidth: '100%', height: 'auto' }} width={440}>
    <PointMark color="series" fillOpacity={0.72} x="time" y="value" />
    <PathMark
      color="series"
      order="trendX"
      series="series"
      strokeWidth={2.4}
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
      x="trendX"
      y="trendY"
    />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
