import { Plot, SectorMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { traffic } from './sector-pie.data';

/** 环图：同饼图，给 coordinate 配 innerRadius 挖出中心空洞 */
const Demo: FC = () => (
  <Plot
    data={traffic}
    width={320}
    height={320}
    coordinate={{ type: 'polar', innerRadius: 0.6 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <SectorMark angle="value" color="source" />
  </Plot>
);

export default Demo;
