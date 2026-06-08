import { Axis, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { events } from './coordinate-polar1d.data';

/** 一维圆周坐标系 polar1D：单角向落固定半径圆周（24 小时绕圈），只需绑 x（角向别名） */
const Demo: FC = () => (
  <Plot data={events} width={300} height={300} coordinate="polar1D" style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark x="hour" />
    <Axis dimension="angle" grid />
  </Plot>
);

export default Demo;
