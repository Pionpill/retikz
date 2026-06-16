import { AreaMark, Axis, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { traffic } from './area-color-split.data';

/** 无显式 series，但给 categorical color 字段 → 按该字段隐式拆多块面积（等价显式 series） */
const Demo: FC = () => (
  <Plot data={traffic} width={360} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <AreaMark x="day" y="visits" color="site" order="day" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
