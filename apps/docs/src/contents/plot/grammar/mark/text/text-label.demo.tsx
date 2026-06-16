import { Axis, BarMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { revenue } from './text-label.data';

/** 柱顶数据标签：BarMark 自带 label，标签挂宿主柱 Node.label（core 边框上方定位），labelFormat 千分位整数 */
const Demo: FC = () => (
  <Plot
    data={revenue}
    model={[
      { name: 'month', type: 'categorical' },
      { name: 'revenue', type: 'continuous' },
    ]}
    width={360}
    height={240}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <BarMark x="month" y="revenue" label="revenue" labelFormat=",.0f" labelPosition="above" labelDistance={6} />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
