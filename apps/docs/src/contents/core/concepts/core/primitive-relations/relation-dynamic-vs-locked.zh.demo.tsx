import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 动态贴边 vs 锁定位置
 * @description 左右两组相同几何：来源 a / b 与目标 T 同在一条水平线，分居 T 两侧。
 *   左组用纯 id（auto）——端点随方向落到 T 的近侧（西 / 东）；
 *   右组锁定到 `T.north`——无论来源在哪，两条都钉在 T 上边中点。
 */
const Demo: FC = () => (
  <Layout width={520} height={200}>
    {/* 左：auto，端点随方向落到近侧 */}
    <Node id="A1" position={[-210, 0]} stroke="none">a</Node>
    <Node id="T1" position={[-130, 0]} stroke="gray" dashPattern={[4, 3]}>T</Node>
    <Node id="B1" position={[-50, 0]} stroke="none">b</Node>
    <Draw way={['A1', 'T1']} arrow="->" />
    <Draw way={['B1', 'T1']} arrow="->" />
    <Node position={[-130, 80]} stroke="none" padding={0} textColor="gray">
      auto：随方向贴边
    </Node>

    {/* 两组之间的分隔 */}
    <Draw way={[[0, -70], [0, 70]]} stroke="lightgray" dashPattern={[4, 4]} />

    {/* 右：锁定到 north，两条都钉在上边中点 */}
    <Node id="A2" position={[50, 0]} stroke="none">a</Node>
    <Node id="T2" position={[130, 0]} stroke="gray" dashPattern={[4, 3]}>T</Node>
    <Node id="B2" position={[210, 0]} stroke="none">b</Node>
    <Draw way={['A2', 'T2.north']} arrow="->" />
    <Draw way={['B2', 'T2.north']} arrow="->" />
    <Node position={[130, 80]} stroke="none" padding={0} textColor="gray">
      锁定 north：定死
    </Node>
  </Layout>
);

export default Demo;
