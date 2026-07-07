import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark } from '@retikz/plot-react';

import { weeklyPipeline } from './line-transform.data';

const Demo: FC = () => (
  <Plot data={weeklyPipeline} width={620} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark x="day" y="value" color="channel" opacity={0.45} minimumSize={6} />
    <PathMark
      x="trendX"
      y="trendY"
      order="trendX"
      stroke="#0f172a"
      strokeWidth={2.5}
      transform={[{ kind: 'smooth', x: 'day', y: 'value', xAs: 'trendX', yAs: 'trendY', sampleCount: 48 }]}
    />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
