import { Plot, SectorMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { traffic } from './sector-pie.data';

/** 饼图：polar + <SectorMark>，angle 值字段自动累积成扇区角界，color 按分类上色 */
const Demo: FC = () => (
  <Plot data={traffic} width={320} height={320} coordinate="polar" style={{ maxWidth: '100%', height: 'auto' }}>
    <SectorMark angle="value" color="source" />
  </Plot>
);

export default Demo;
