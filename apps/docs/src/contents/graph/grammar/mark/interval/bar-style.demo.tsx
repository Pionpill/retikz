import { Axis, IntervalMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { revenue } from './bar-basic.data';

const Demo: FC = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <Plot data={revenue} width={300} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
      <IntervalMark
        x="quarter"
        y="value"
        color="quarter"
        cornerRadius={8}
        stroke="#ffffff"
        strokeWidth={1.5}
        fillOpacity={0.86}
        label="value"
        labelPosition="above"
        labelDistance={6}
        labelFont={{ size: 10, weight: 'bold' }}
      />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot
      data={revenue}
      width={300}
      height={220}
      coordinate={{ type: 'polar2D', innerRadius: 0.58 }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <IntervalMark
        angle="value"
        color="quarter"
        cornerRadius={8}
        padAngle={4}
        stroke="transparent"
        strokeWidth={0}
        fillOpacity={0.88}
        shadow={{ preset: 'md', color: '#0f172a', opacity: 0.28 }}
        label="value"
        labelPosition="above"
        labelDistance={12}
        labelFont={{ size: 10, weight: 'bold' }}
      />
    </Plot>
  </div>
);

export default Demo;
