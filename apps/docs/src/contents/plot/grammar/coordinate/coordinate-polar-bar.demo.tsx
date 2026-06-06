import { BarMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { temperature } from './coordinate-cartesian.data';

/** 只把 coordinate 改成 polar：同一份数据、同一个 <BarMark>，柱自动绕中心成径向柱 */
const Demo: FC = () => (
  <Plot data={temperature} width={320} height={320} coordinate="polar2D" style={{ maxWidth: '100%', height: 'auto' }}>
    <BarMark x="month" y="value" color="month" />
  </Plot>
);

export default Demo;
