import { Axis, LineMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { wind } from './coordinate-polar-line.data';

/** 极坐标折线：polar + 普通折线（不闭合），x → 角向、y → 径向 */
const Demo: FC = () => (
  <Plot data={wind} width={320} height={320} coordinate="polar" style={{ maxWidth: '100%', height: 'auto' }}>
    <LineMark x="angle" y="speed" order="angle" />
    <Axis dimension="angle" />
    <Axis dimension="radius" grid />
  </Plot>
);

export default Demo;
