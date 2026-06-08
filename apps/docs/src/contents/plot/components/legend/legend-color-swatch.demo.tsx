import { Legend, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { cities } from './legend.data';

/** 分类色 swatch 图例：color 绑分类字段 → ordinal scale，图例每类一色块；默认 x/y 轴仍在 */
const Demo: FC = () => (
  <Plot data={cities} width={360} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark x="lng" y="lat" color="region" />
    <Legend channel="color" title="Region" />
  </Plot>
);

export default Demo;
