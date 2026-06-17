import { BarMark, Plot, Transform } from '@retikz/plot-react';
import type { FC } from 'react';

import { orders } from './transform-aggregate.data';

/** 分组聚合柱：<Transform kind="aggregate"> 把订单明细按 region 求 revenue 总和（N 笔 → M 组），柱读组键 + 规约值 */
const Demo: FC = () => (
  <Plot data={orders} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Transform kind="aggregate" groupBy={['region']} reduce="sum" field="revenue" as="total" />
    <BarMark x="region" y="total" color="region" />
  </Plot>
);

export default Demo;
