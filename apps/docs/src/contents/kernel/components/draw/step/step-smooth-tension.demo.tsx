import type { FC } from 'react';

import { Circle, Layout, Path, Step } from '@retikz/react';

const KNOTS: Array<[number, number]> = [
  [-150, 30],
  [-50, -55],
  [50, 30],
  [150, -55],
];

/**
 * tension 控制曲线松紧
 * @description 同一组点、三条 smooth 曲线：tension<1 更紧（更接近折线），缺省 1 为标准 centripetal Catmull-Rom，
 *   tension>1 更鼓（控制点离端点更远）。过点不变，只是切线长度被缩放。
 */
const Demo: FC = () => (
  <Layout width={380} height={210}>
    <Path stroke="lightgray" strokeWidth={2}>
      <Step kind="move" to={KNOTS[0]} />
      <Step kind="smooth" points={KNOTS.slice(1)} tension={0.5} />
    </Path>
    <Path stroke="steelblue" strokeWidth={2}>
      <Step kind="move" to={KNOTS[0]} />
      <Step kind="smooth" points={KNOTS.slice(1)} />
    </Path>
    <Path stroke="orange" strokeWidth={2}>
      <Step kind="move" to={KNOTS[0]} />
      <Step kind="smooth" points={KNOTS.slice(1)} tension={1.6} />
    </Path>
    {KNOTS.map((p, i) => (
      <Circle key={i} center={p} radius={3} fill="black" stroke="none" />
    ))}
  </Layout>
);

export default Demo;
