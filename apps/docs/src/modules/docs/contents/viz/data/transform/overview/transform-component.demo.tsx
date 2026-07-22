import type { FC } from 'react';

import { Axis, IntervalMark, Plot, Transform } from '@retikz/plot-react';

import { regionalOrders } from './transform-component.data';

/** 两个 Transform 按声明顺序运行：summarize 先产出 total，sort 再读取 total */
const Demo: FC = () => (
  <Plot data={regionalOrders} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Transform kind="summarize" groupBy={['region']} metrics={[{ kind: 'sum', field: 'revenue', as: 'total' }]} />
    <Transform kind="sort" field="total" order="descending" />
    <IntervalMark x="region" y="total" color="region" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
