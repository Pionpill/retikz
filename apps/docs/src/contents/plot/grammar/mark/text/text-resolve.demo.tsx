import { Axis, BarMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { revenue } from './text-label.data';

/** 自定义模板标签：resolveLabel 运行时拼接 `月份: 营收`（不进 IR、按 mark id 注入），覆盖 label/format 声明 */
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
    <BarMark id="bars" x="month" y="revenue" label="revenue" resolveLabel={row => `${row.month}: ${row.revenue}`} labelPosition="above" labelDistance={6} />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
