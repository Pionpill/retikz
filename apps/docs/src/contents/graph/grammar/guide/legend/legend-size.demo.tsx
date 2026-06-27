import { Axis, Legend, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { cities } from './legend.data';

/** size 梯度符号图例：size 绑连续字段（model 声明）→ sqrt scale，图例是几档代表大小的圈 + 值；放在底部 */
const Demo: FC = () => (
  <Plot
    data={cities}
    model={[
      { name: 'lng', type: 'continuous' },
      { name: 'lat', type: 'continuous' },
      { name: 'pop', type: 'continuous' },
    ]}
    width={360}
    height={260}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark x="lng" y="lat" size="pop" />
    <Legend channel="size" position="bottom" title="Population" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
