import { Axis, BarMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { sales } from './bar-grouped.data';

/** 分组柱：series 按产品拆系列，同类别内并排（dodge），系列自动着色 */
const Demo: FC = () => (
  <Plot data={sales} width={360} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <BarMark x="quarter" y="revenue" series="product" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
