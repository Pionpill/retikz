import type { FC } from 'react';

import { Circle, Layout, Path, Step } from '@retikz/react';

const KNOTS: Array<[number, number]> = [
  [-160, -10],
  [-70, -55],
  [20, 0],
  [110, -50],
  [170, -15],
];

/**
 * 过点平滑曲线 vs 直线折线
 * @description 同一组点：蓝色 kind="smooth" 画一条穿过所有点的光滑曲线，灰色用 line 逐点连成折线。
 *   smooth 从游标（首个 move）起、依次穿过 points 每个点；游标终于末点。小圆点标出各 knot 位置。
 */
const Demo: FC = () => (
  <Layout width={380} height={200}>
    <Path stroke="gray" strokeWidth={2}>
      <Step kind="move" to={KNOTS[0]} />
      {KNOTS.slice(1).map((p, i) => (
        <Step key={i} to={p} />
      ))}
    </Path>
    <Path stroke="steelblue" strokeWidth={2}>
      <Step kind="move" to={KNOTS[0]} />
      <Step kind="smooth" points={KNOTS.slice(1)} />
    </Path>
    {KNOTS.map((p, i) => (
      <Circle key={i} center={p} radius={3} fill="steelblue" stroke="none" />
    ))}
  </Layout>
);

export default Demo;
