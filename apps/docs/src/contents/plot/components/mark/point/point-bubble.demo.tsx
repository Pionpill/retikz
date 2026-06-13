import { Axis, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { cities } from './point-scatter.data';

/** 气泡图：size 绑数值字段，点半径经平方根 scale 映射，面积正比于值 */
const Demo: FC = () => (
  <Plot data={cities} width={360} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark x="lng" y="lat" size="pop" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
