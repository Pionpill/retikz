import { Axis, BarMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { revenue } from './plot-cartesian.data';

/** 同一份 children，仅 coordinate 不同：缺省 cartesian（左）vs polar2D（右） */
const Demo: FC = () => (
  <div className="flex flex-wrap items-center justify-center gap-6">
    <Plot data={revenue} width={300} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
      <BarMark x="quarter" y="value" color="quarter" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={revenue} width={260} height={260} coordinate="polar2D" style={{ maxWidth: '100%', height: 'auto' }}>
      <BarMark x="quarter" y="value" color="quarter" />
      <Axis dimension="angle" />
      <Axis dimension="radius" grid />
    </Plot>
  </div>
);

export default Demo;
