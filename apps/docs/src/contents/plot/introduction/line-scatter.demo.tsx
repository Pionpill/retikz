import { LineMark, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

/** 外部数据集：裸数据行，不进 IR，<Plot> 内部经 lowerPlots 注入 */
const sales: Array<Record<string, number>> = [
  { month: 0, revenue: 10 },
  { month: 1, revenue: 14 },
  { month: 2, revenue: 9 },
  { month: 3, revenue: 18 },
  { month: 4, revenue: 15 },
];

/** 组合 DSL：声明「画什么」（折线 + 散点叠两层），scale / coordinate 自动推断 */
const Demo: FC = () => (
  <Plot data={sales} width={360} height={200} style={{ maxWidth: '100%', height: 'auto' }}>
    <LineMark x="month" y="revenue" order="month" />
    <PointMark x="month" y="revenue" />
  </Plot>
);

export default Demo;
