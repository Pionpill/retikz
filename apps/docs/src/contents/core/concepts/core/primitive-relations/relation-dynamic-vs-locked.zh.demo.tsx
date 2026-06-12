import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 动态贴边 vs 锁定位置
 * @description 左右两组相同几何：两个来源节点分居目标左上 / 右下。
 *   左组用纯 id 引用（auto）——端点随来源方向分别落到目标 NW / SE 边；
 *   右组锁定到 `.north`——无论来源在哪，端点都钉在目标上边中点。
 */
const Demo: FC = () => (
  <Layout width={520} height={240}>
    {/* 左：auto，端点随方向变 */}
    <Node id="T1" position={[-130, 0]}>t</Node>
    <Node id="A1" position={[-220, -80]}>a</Node>
    <Node id="B1" position={[-40, 80]}>b</Node>
    <Draw way={['A1', 'T1']} arrow="->" />
    <Draw way={['B1', 'T1']} arrow="->" />
    <Node position={[-130, 130]} stroke="none" padding={0} textColor="gray">
      auto：随方向贴边
    </Node>

    {/* 右：锁定到 north，端点定死 */}
    <Node id="T2" position={[130, 0]}>t</Node>
    <Node id="A2" position={[40, -80]}>a</Node>
    <Node id="B2" position={[220, 80]}>b</Node>
    <Draw way={['A2', 'T2.north']} arrow="->" />
    <Draw way={['B2', 'T2.north']} arrow="->" />
    <Node position={[130, 130]} stroke="none" padding={0} textColor="gray">
      锁定 north：定死
    </Node>
  </Layout>
);

export default Demo;
