import { Layout, Path, Step } from '@retikz/react';
import type { FC } from 'react';

/**
 * 路径整体变换：rotate / scale 把整条 path 绕包围盒中心变换（免包 Scope）。
 * 左蓝为原始直角折线，右红为同形状 rotate={40}（绕各自包围盒中心旋转）。
 */
const Demo: FC = () => (
  <Layout width={320} height={140}>
    <Path stroke="dodgerblue" strokeWidth={2}>
      <Step kind="move" to={[20, 20]} />
      <Step kind="line" to={[20, 90]} />
      <Step kind="line" to={[90, 90]} />
    </Path>
    <Path stroke="red" strokeWidth={2} rotate={40}>
      <Step kind="move" to={[190, 20]} />
      <Step kind="line" to={[190, 90]} />
      <Step kind="line" to={[260, 90]} />
    </Path>
  </Layout>
);

export default Demo;
