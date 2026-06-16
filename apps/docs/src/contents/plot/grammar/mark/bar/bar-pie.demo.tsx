import { BarMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { traffic } from './bar-pie.data';

/** 饼图：polar + <BarMark angle>，angle 值字段自动累积成扇区角界，color 按分类上色 */
const Demo: FC = () => (
  <Plot data={traffic} width={320} height={320} coordinate="polar2D" style={{ maxWidth: '100%', height: 'auto' }}>
    <BarMark angle="value" color="source" />
  </Plot>
);

export default Demo;
