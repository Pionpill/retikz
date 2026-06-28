import { IntervalMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { pulledTraffic } from './interval-pull.data';

const Demo: FC = () => (
  <Plot
    data={pulledTraffic}
    width={300}
    height={240}
    coordinate={{ type: 'polar2D', innerRadius: 0.46 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <IntervalMark
      angle="value"
      color="source"
      padAngle={2}
      pull="pull"
      stroke="#ffffff"
      strokeWidth={1.5}
      label="source"
      labelPosition="right"
      labelDistance={8}
      labelFont={{ size: 10, weight: 'bold' }}
    />
  </Plot>
);

export default Demo;
