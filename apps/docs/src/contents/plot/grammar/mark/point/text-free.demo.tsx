import { Axis, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { points } from './text-free.data';

/** 自由文本标注：散点旁用 <PointMark> 的 text 通道标品类名（无宿主、新建带 text 的 Node、投影同 point），dy 微调上移避免压点 */
const Demo: FC = () => (
  <Plot
    data={points}
    model={[
      { name: 'x', type: 'continuous' },
      { name: 'y', type: 'continuous' },
      { name: 'label', type: 'categorical' },
      { name: 'cat', type: 'categorical' },
    ]}
    width={360}
    height={240}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark x="x" y="y" color="cat" />
    <PointMark x="x" y="y" text="label" dy={-12} />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
