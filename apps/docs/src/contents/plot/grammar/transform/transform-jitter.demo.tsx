import { Plot, PointMark, Transform } from '@retikz/plot-react';
import type { FC } from 'react';

import { samples } from './transform-jitter.data';

/**
 * jitter 散点：连续数值 dose 字段上多点重叠，<Transform kind="jitter"> 在数据空间加 ±amount 偏移抖开。
 * seed 固定 → SSR 与浏览器 hydration 抖出同一组坐标（确定性）。
 */
const Demo: FC = () => (
  <Plot data={samples} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Transform kind="jitter" axis="x" xField="dose" amount={0.18} seed={42} />
    <PointMark x="dose" y="response" />
  </Plot>
);

export default Demo;
