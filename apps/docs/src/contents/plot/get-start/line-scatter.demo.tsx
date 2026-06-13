import { Axis, LineMark, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { sales } from './line-scatter.data';

/** 组合 DSL：声明「画什么」（折线 + 散点叠两层），scale / coordinate 自动推断 */
const Demo: FC = () => (
  <Plot data={sales} width={360} height={200} style={{ maxWidth: '100%', height: 'auto' }}>
    <LineMark x="month" y="revenue" order="month" />
    <PointMark x="month" y="revenue" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
