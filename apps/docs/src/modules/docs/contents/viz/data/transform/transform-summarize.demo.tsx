import type { FC } from 'react';

import { Axis, IntervalMark, Plot, Transform } from '@retikz/plot-react';

import { orders } from './transform-summarize.data';

/** 分组汇总柱：<Transform kind="summarize"> 把订单明细按 region 求 revenue 总和（N 笔 → M 组），柱读组键 + 规约值 */
const Demo: FC = () => (
  <Plot data={orders} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Transform kind="summarize" groupBy={['region']} metrics={[{ kind: 'sum', field: 'revenue', as: 'total' }]} />
    <IntervalMark x="region" y="total" color="region" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
