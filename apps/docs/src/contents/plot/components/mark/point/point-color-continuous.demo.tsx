import { Axis, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { cities } from './point-scatter.data';

/** 连续着色：color 绑连续数值字段 + model 声明 → 自动 sequential 色阶（viridis），点按值取色 */
const Demo: FC = () => (
  <Plot
    data={cities}
    model={[
      { name: 'lng', type: 'continuous' },
      { name: 'lat', type: 'continuous' },
      { name: 'pop', type: 'continuous' },
    ]}
    width={360}
    height={240}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark x="lng" y="lat" color="pop" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
