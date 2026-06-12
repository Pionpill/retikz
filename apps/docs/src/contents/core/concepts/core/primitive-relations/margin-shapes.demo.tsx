import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * margin 对不同 boundary 形状的作用
 * @description 三个 shape 都设 margin：椭圆 / 正五边形是文本容器形状（尺寸由内框驱动），margin 把连接边界整体外扩，
 *   端点退开 margin 间隙；五角星是参数驱动形状（尺寸由 outerRadius 定），margin 只外扩外接框、不改星形边界，
 *   端点仍贴真实尖角——没有间隙。
 */
const M = 18;

const Demo: FC = () => (
  <Layout width={520} height={200}>
    {/* 椭圆：rect 驱动，margin 外扩 → 端点退开 margin */}
    <Node id="ell" position={[-165, 16]} shape="ellipse" minimumWidth={52} minimumHeight={40} margin={M} stroke="gray" dashPattern={[4, 3]} />
    <Draw way={[[-165, -78], 'ell']} arrow="->" />

    {/* 五角星：params 驱动，margin 不外扩 → 端点贴真实尖角 */}
    <Node id="star" position={[0, 16]} shape={{ type: 'star', params: { points: 5, innerRadius: 15, outerRadius: 36 } }} margin={M} stroke="gray" dashPattern={[4, 3]} />
    <Draw way={[[0, -78], 'star']} arrow="->" />

    {/* 正五边形：rect 驱动，margin 外扩 */}
    <Node id="pent" position={[165, 16]} shape={{ type: 'polygon', params: { sides: 5, rotate: -90 } }} minimumWidth={56} minimumHeight={52} margin={M} stroke="gray" dashPattern={[4, 3]} />
    <Draw way={[[165, -78], 'pent']} arrow="->" />

    <Node position={[-165, 86]} stroke="none" padding={0} textColor="gray">
      ellipse · gap
    </Node>
    <Node position={[0, 86]} stroke="none" padding={0} textColor="gray">
      star · no gap
    </Node>
    <Node position={[165, 86]} stroke="none" padding={0} textColor="gray">
      pentagon · gap
    </Node>
  </Layout>
);

export default Demo;
