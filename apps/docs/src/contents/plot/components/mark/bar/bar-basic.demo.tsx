import { BarMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { revenue } from './bar-basic.data';

/** 单系列柱：x 是分类字段（自动 band scale），y 从 baseline 0 起 */
const Demo: FC = () => (
  <Plot data={revenue} width={360} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <BarMark x="quarter" y="value" />
  </Plot>
);

export default Demo;
