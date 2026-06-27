import { Axis, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { soils } from './coordinate-ternary.data';

/** ternary2D：x/y/z 三个分量自动归一化，并投影到等边三角形内 */
const Demo: FC = () => (
  <Plot data={soils} width={340} height={340} coordinate="ternary2D" style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark x="sand" y="silt" z="clay" color="region" />
    <Axis dimension="x" />
    <Axis dimension="y" />
    <Axis dimension="z" />
  </Plot>
);

export default Demo;
