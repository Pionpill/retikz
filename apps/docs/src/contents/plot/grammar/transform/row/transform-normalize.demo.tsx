import { Axis, IntervalMark, Plot, Transform } from '@retikz/plot-react';
import type { FC } from 'react';

import { revenue } from './transform-normalize.data';

/**
 * 百分比堆叠：显式 [normalize, stack] 两步链——normalize 把每季度内各产品 amount 归一成占比（percent），
 * stack 再累积归一化后的 share 成 y0/y1。<IntervalMark stack> 让柱读这对累积界（stack 累积界 = bounds y extent）；因管线已显式
 * 含一个 stack transform，自动装配的那个 stack 被抑制（B4 去重），不会对同一组数据二次堆叠。
 */
const Demo: FC = () => (
  <Plot data={revenue} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Transform kind="normalize" field="amount" groupBy={['quarter']} basis="percent" as="share" />
    <Transform kind="stack" x="quarter" y="share" groupBy="product" />
    <IntervalMark x="quarter" y="share" series="product" stack />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
