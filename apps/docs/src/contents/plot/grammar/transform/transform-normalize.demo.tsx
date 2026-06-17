import { BarMark, Plot, Transform } from '@retikz/plot-react';
import type { FC } from 'react';

import { revenue } from './transform-normalize.data';

/**
 * 百分比堆叠：显式 [normalize, stack] 两步链——normalize 把每季度内各产品 amount 归一成占比（percent），
 * stack 再累积归一化后的 share。显式 stack 已抑制 <BarMark> 的自动堆叠（不二次堆叠）。
 */
const Demo: FC = () => (
  <Plot data={revenue} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Transform kind="normalize" field="amount" groupBy={['quarter']} basis="percent" as="share" />
    <Transform kind="stack" x="quarter" y="share" groupBy="product" />
    <BarMark x="quarter" y="share" series="product" stack />
  </Plot>
);

export default Demo;
