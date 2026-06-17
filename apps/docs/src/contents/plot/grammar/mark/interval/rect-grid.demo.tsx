import { Axis, IntervalMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { slots } from './rect-grid.data';

/** 纯网格：缺 color → 双 band 定格、统一默认填充（无值映射），可作底格再叠 point / text */
const Demo: FC = () => (
  <Plot
    data={slots}
    model={[
      { name: 'day', type: 'categorical' },
      { name: 'slot', type: 'categorical' },
    ]}
    width={300}
    height={200}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <IntervalMark x="day" y="slot" bounds={{ x: { kind: 'band' }, y: { kind: 'band' } }} />
    <Axis dimension="x" />
    <Axis dimension="y" />
  </Plot>
);

export default Demo;
