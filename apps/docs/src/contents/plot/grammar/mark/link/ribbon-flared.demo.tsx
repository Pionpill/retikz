import { LinkMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { streams } from './ribbon-flared.data';

/** 喇叭带：endWidth 给目标端独立宽度（源宽 ≠ 目标宽），curvature 调 S 形张力 */
const Demo: FC = () => (
  <Plot data={streams} width={320} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
    <LinkMark sourceX="sourceX" sourceY="sourceY" targetX="targetX" targetY="targetY" value="value" endWidth="endValue" curvature={0.6} color="stage" />
  </Plot>
);

export default Demo;
