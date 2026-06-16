import { Plot, RibbonMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { flows } from './ribbon-basic.data';

/** 两列 alluvial 流带：sourceX/Y → targetX/Y 经坐标系投影成曲带，value → 带宽，channel → color 分组上色 */
const Demo: FC = () => (
  <Plot data={flows} width={320} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
    <RibbonMark sourceX="sourceX" sourceY="sourceY" targetX="targetX" targetY="targetY" value="value" color="channel" />
  </Plot>
);

export default Demo;
