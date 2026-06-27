import { Axis, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { samples } from './coordinate-rug.data';

/** 一维直线坐标系 cartesian1D：单维落一条轴线（rug 刻记），只需绑 x */
const Demo: FC = () => (
  <Plot data={samples} width={420} height={96} coordinate="cartesian1D" style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark x="value" />
    <Axis dimension="x" />
  </Plot>
);

export default Demo;
