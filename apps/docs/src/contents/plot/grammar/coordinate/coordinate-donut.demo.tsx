import { Plot, SectorMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { share } from './coordinate-pie.data';

/** 环图：在饼图基础上给 coordinate 对象配 innerRadius，挖出中心空洞 */
const Demo: FC = () => (
  <Plot
    data={share}
    width={320}
    height={320}
    coordinate={{ type: 'polar', innerRadius: 0.55 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <SectorMark angle="value" color="label" />
  </Plot>
);

export default Demo;
