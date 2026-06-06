import { LineMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { revenue } from './line-basic.data';

/** 基础折线：x / y 绑字段，order 决定连线顺序 */
const Demo: FC = () => (
  <Plot data={revenue} width={360} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <LineMark x="month" y="revenue" order="month" />
  </Plot>
);

export default Demo;
