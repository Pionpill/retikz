import { Axis, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { cities } from './point-scatter.data';

/** 分类着色：color 绑分类字段，每个点按类别取色（按 datum 着色，不拆系列） */
const Demo: FC = () => (
  <Plot data={cities} width={360} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark x="lng" y="lat" color="region" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
