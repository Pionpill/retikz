import { BarMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { rainfall } from './bar-radial.data';

/** 径向柱：仅 coordinate="polar"，同一 BarMark 角向自动 band、径向是值 */
const Demo: FC = () => (
  <Plot data={rainfall} width={320} height={320} coordinate="polar" style={{ maxWidth: '100%', height: 'auto' }}>
    <BarMark x="month" y="value" color="month" />
  </Plot>
);

export default Demo;
