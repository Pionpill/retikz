import { Axis, Plot, RectMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { matrix } from './rect-heatmap.data';

/** 基础热图：x / y 双分类（自动 band），value 绑 color + model 声明 → 自动 sequential 色阶（viridis），每格按值取色 */
const Demo: FC = () => (
  <Plot
    data={matrix}
    model={[
      { name: 'row', type: 'categorical' },
      { name: 'col', type: 'categorical' },
      { name: 'value', type: 'continuous' },
    ]}
    width={300}
    height={260}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <RectMark x="col" y="row" color="value" />
    <Axis dimension="x" />
    <Axis dimension="y" />
  </Plot>
);

export default Demo;
