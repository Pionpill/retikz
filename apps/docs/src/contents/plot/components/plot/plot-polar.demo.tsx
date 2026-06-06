import { BarMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { revenue } from './plot-cartesian.data';

/** polar：仅加 coordinate="polar"，同一份 children 改成极坐标 */
const Demo: FC = () => (
  <Plot data={revenue} width={320} height={320} coordinate="polar" style={{ maxWidth: '100%', height: 'auto' }}>
    <BarMark x="quarter" y="value" color="quarter" />
  </Plot>
);

export default Demo;
