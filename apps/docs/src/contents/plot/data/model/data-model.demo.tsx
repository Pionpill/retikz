import { Axis, LineMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { sales } from './data-model.data';

/** 声明 model 后无需手写 scale：month(temporal)→time 轴、revenue(continuous)→linear 轴，全自动派生 */
const Demo: FC = () => (
  <Plot
    data={sales}
    model={[
      { name: 'month', type: 'temporal' },
      { name: 'revenue', type: 'continuous' },
    ]}
    width={360}
    height={220}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <LineMark x="month" y="revenue" order="month" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
