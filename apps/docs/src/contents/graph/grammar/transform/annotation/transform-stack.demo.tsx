import type { FC } from 'react';

import { Axis, IntervalMark, Plot, Transform } from '@retikz/plot-react';

import { productRevenue } from './transform-stack.data';

/** stack 柱图：显式 stack 先产出 y0/y1，IntervalMark stack 读取这对累积界并抑制重复自动 stack。 */
const Demo: FC = () => (
  <Plot data={productRevenue} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Transform kind="stack" x="quarter" y="revenue" groupBy="product" />
    <IntervalMark x="quarter" y="revenue" series="product" stack />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
