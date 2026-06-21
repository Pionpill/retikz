import { Axis, PathMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { ability } from './axis-polar.data';

/** polar 轴：dimension="x" 角向标签 + dimension="y" 同心环网格 */
const Demo: FC = () => (
  <Plot data={ability} width={320} height={320} coordinate="polar2D" style={{ maxWidth: '100%', height: 'auto' }}>
    <PathMark x="dim" y="value" closed />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
