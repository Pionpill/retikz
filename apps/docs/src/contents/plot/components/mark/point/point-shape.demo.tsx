import { Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { cities } from './point-scatter.data';

/** 形状编码：shape 绑分类字段，按类别映射到 glyph 调色板（circle / rectangle / diamond） */
const Demo: FC = () => (
  <Plot data={cities} width={360} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark x="lng" y="lat" shape="region" />
  </Plot>
);

export default Demo;
