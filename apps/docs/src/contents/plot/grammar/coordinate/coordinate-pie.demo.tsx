import { Plot, SectorMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { share } from './coordinate-pie.data';

/** 饼图：polar + <SectorMark>，angle 值字段自动累积成各扇区角界 */
const Demo: FC = () => (
  <Plot data={share} width={320} height={320} coordinate="polar" style={{ maxWidth: '100%', height: 'auto' }}>
    <SectorMark angle="value" color="label" />
  </Plot>
);

export default Demo;
