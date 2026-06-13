import { Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { cities } from './point-scatter.data';

/** 基础散点：x / y 绑字段，每行一个点 */
const Demo: FC = () => (
  <Plot data={cities} width={360} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark x="lng" y="lat" />
  </Plot>
);

export default Demo;
