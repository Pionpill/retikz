import { Legend, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { cities } from './legend.data';

/** 连续色 ramp 图例：color 绑连续字段 + model 声明 → sequential 色阶，图例是色带 + 刻度 */
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
    <Legend channel="color" title="Population" />
  </Plot>
);

export default Demo;
