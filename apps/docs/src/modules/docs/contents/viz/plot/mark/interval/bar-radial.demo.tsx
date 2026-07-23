import type { FC } from 'react';

import { IntervalMark, Plot } from '@retikz/plot-react';

import { rainfall } from './bar-radial.data';

/** 径向柱：仅 coordinate="polar2D"，同一 IntervalMark 角向自动 band、径向是值 */
const Demo: FC = () => (
  <Plot data={rainfall} width={220} height={220} coordinate="polar2D" style={{ maxWidth: '100%', height: 'auto' }}>
    <IntervalMark x="month" y="value" color="month" />
  </Plot>
);

export default Demo;
