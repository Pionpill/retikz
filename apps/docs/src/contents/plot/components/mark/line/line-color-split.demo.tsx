import { LineMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { climate } from './line-series.data';

/** 无显式 series，但给 categorical color 字段 → 按该字段隐式拆系列（等价显式 series） */
const Demo: FC = () => (
  <Plot data={climate} width={360} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <LineMark x="month" y="temp" color="city" order="month" />
  </Plot>
);

export default Demo;
