import type { FC } from 'react';

import { Axis, Plot, PointMark, Transform } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { samples } from './transform-jitter.data';

/**
 * jitter 对比：左面板每个剂量上的 4 个点挤在同一 x 上重叠；
 * 右面板加 <Transform kind="jitter">，在数据空间给 dose 加 ±amount 偏移把点抖开。
 * seed 固定 → SSR 与浏览器 hydration 抖出同一组坐标（确定性）。
 */
const Demo: FC = () => (
  <Layout width={620} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={samples} width={300} height={220} x={0} y={20}>
      <PointMark x="dose" y="response" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={samples} width={300} height={220} x={320} y={20}>
      <Transform kind="jitter" axis="x" xField="dose" amount={0.18} seed={42} />
      <PointMark x="dose" y="response" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
