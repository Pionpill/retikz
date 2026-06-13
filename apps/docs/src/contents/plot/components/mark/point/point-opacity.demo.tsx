import { Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { cities } from './point-scatter.data';

/** 透明度编码：opacity 绑连续字段，经 clamp linear scale 映射到 [minOpacity, 1] */
const Demo: FC = () => (
  <Plot data={cities} width={360} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark x="lng" y="lat" opacity="pop" />
  </Plot>
);

export default Demo;
