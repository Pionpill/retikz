import { Axis, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { soils } from './coordinate-ternary.data';

/** 三元坐标系 ternary2D：三个分量 a/b/c 自动归一化 + 重心投影到等边三角内 */
const Demo: FC = () => (
  <Plot data={soils} width={340} height={340} coordinate="ternary2D" style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark a="sand" b="silt" c="clay" color="region" />
    <Axis dimension="a" />
    <Axis dimension="b" />
    <Axis dimension="c" />
  </Plot>
);

export default Demo;
