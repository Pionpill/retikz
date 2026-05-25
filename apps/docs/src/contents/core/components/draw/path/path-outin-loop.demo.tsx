import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

/**
 * out/in 出入射角：bend step 用 outAngle/inAngle 画非对称曲线；from==to 同节点时退化为自环。
 * 自环是 out/in 的最大价值场景（状态机自跳转），对称 bend 画不出。
 */
const Demo: FC = () => (
  <Layout width={320} height={150}>
    <Node id="S" position={[50, 90]} shape="circle">
      S
    </Node>
    <Node id="T" position={[230, 90]} shape="circle">
      T
    </Node>
    {/* 自环：from==to 同节点，out/in 角撑开 */}
    <Path arrow="->" stroke="teal">
      <Step kind="move" to="S" />
      <Step kind="bend" to="S" outAngle={120} inAngle={60} />
    </Path>
    {/* out/in 非对称曲线 S→T */}
    <Path arrow="->" stroke="green">
      <Step kind="move" to="S" />
      <Step kind="bend" to="T" outAngle={-25} inAngle={-155} />
    </Path>
  </Layout>
);

export default Demo;
