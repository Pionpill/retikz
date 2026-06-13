import { LineMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { climate } from './line-series.data';

/** 多系列折线：series 按城市拆成多条线，自动着色 */
const Demo: FC = () => (
  <Plot data={climate} width={360} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <LineMark x="month" y="temp" series="city" order="month" />
  </Plot>
);

export default Demo;
