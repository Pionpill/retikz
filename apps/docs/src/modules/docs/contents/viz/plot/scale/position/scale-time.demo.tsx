import type { FC } from 'react';

import { Axis, PathMark, Plot } from '@retikz/plot-react';

import { visits } from './scale-time.data';

/** model 把 date 声明为 temporal，x 自动走 time 比例尺：刻度落时间边界、标签按时间格式化 */
const Demo: FC = () => (
  <Plot
    data={visits}
    model={[
      { name: 'date', type: 'temporal' },
      { name: 'value', type: 'continuous' },
    ]}
    width={360}
    height={200}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PathMark x="date" y="value" order="date" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
