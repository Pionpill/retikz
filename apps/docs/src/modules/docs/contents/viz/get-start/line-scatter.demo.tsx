import type { FC } from 'react';

import { PathMark, Plot, PlotAxis, PointMark } from '@retikz/plot-react';

import { sales } from './line-scatter.data';

/** 组合 DSL：声明「画什么」（折线 + 散点叠两层），scale / coordinate 自动推断 */
const Demo: FC = () => (
  <Plot data={sales} width={360} height={200} style={{ maxWidth: '100%', height: 'auto' }}>
    <PathMark x="month" y="revenue" order="month" />
    <PointMark x="month" y="revenue" />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);

export default Demo;
