import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

/**
 * 几何圆角 vs 描边 round join
 * @description 用一条很粗的描边凸显区别：上方 lineJoin="round" 只把描边拐角磨圆，路径几何（中心线）仍是尖折；
 *   下方 roundedCorners 把路径几何本身倒圆——中心线就是圆弧，影响 bbox / 弧长 / 连接点。
 */
const Demo: FC = () => (
  <Layout width={360} height={210}>
    <Path stroke="lightgray" strokeWidth={22} lineJoin="round">
      <Step kind="move" to={[-130, -50]} />
      <Step to={[0, -95]} />
      <Step to={[130, -50]} />
    </Path>
    <Path stroke="black" strokeWidth={1}>
      <Step kind="move" to={[-130, -50]} />
      <Step to={[0, -95]} />
      <Step to={[130, -50]} />
    </Path>

    <Path stroke="lightblue" strokeWidth={22} roundedCorners={40}>
      <Step kind="move" to={[-130, 70]} />
      <Step to={[0, 25]} />
      <Step to={[130, 70]} />
    </Path>
    <Path stroke="steelblue" strokeWidth={1} roundedCorners={40}>
      <Step kind="move" to={[-130, 70]} />
      <Step to={[0, 25]} />
      <Step to={[130, 70]} />
    </Path>
  </Layout>
);

export default Demo;
