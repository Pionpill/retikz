import { Layout, Path, Step } from '@retikz/react';
import type { FC } from 'react';

/**
 * 折线几何圆角 vs 尖角
 * @description 同一条折线：上方 roundedCorners 把每个 line-line 内拐角倒成圆角弧，下方默认尖角。
 *   roundedCorners 改的是路径几何（端点回退 + 插弧），首尾端点保持尖。
 */
const Demo: FC = () => (
  <Layout width={360} height={200}>
    <Path stroke="steelblue" strokeWidth={2} roundedCorners={16}>
      <Step kind="move" to={[-150, -50]} />
      <Step to={[-50, -90]} />
      <Step to={[50, -50]} />
      <Step to={[150, -90]} />
    </Path>
    <Path stroke="gray" strokeWidth={2}>
      <Step kind="move" to={[-150, 70]} />
      <Step to={[-50, 30]} />
      <Step to={[50, 70]} />
      <Step to={[150, 30]} />
    </Path>
  </Layout>
);

export default Demo;
