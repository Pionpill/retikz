import { Axis, LineMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { ability } from './axis-polar.data';

/** polar 轴：dimension="angle" 角向标签 + dimension="radius" 同心环网格 */
const Demo: FC = () => (
  <Plot data={ability} width={320} height={320} coordinate="polar2D" style={{ maxWidth: '100%', height: 'auto' }}>
    <LineMark x="dim" y="value" closed />
    <Axis dimension="angle" />
    <Axis dimension="radius" grid />
  </Plot>
);

export default Demo;
