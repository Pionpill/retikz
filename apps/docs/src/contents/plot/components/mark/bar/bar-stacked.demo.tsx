import { BarMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { sales } from './bar-stacked.data';

/** 堆叠柱：series + stack，同类别内累叠（自动装配 stack 变换派生 y0/y1），系列自动着色 */
const Demo: FC = () => (
  <Plot data={sales} width={360} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <BarMark x="quarter" y="revenue" series="product" stack />
  </Plot>
);

export default Demo;
