import { Circle, Draw, Layout, Node, Rectangle, RegularPolygon, Star } from '@retikz/react';
import type { FC } from 'react';

/**
 * 形状家族的两副面相
 * @description 上排同一组形状作为 Path 图形（Sugar）画成轮廓线；下排作为 Node 形状带边界、可装文字、可连线；
 *   左侧灰标点出两副面相，下排一条灰箭头示意 Node 形状可被连接。caption / 行标用 stroke/fill none 的灰字。
 */
const Demo: FC = () => (
  <Layout width={560} height={240}>
    {/* 行标 */}
    <Node id="rowPath" position={[-235, -55]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      Path 线
    </Node>
    <Node id="rowNode" position={[-235, 55]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      Node 边界
    </Node>

    {/* 上排：作为 Path 图形（Sugar）——纯轮廓线 */}
    <Circle center={[-120, -55]} radius={24} fill="none" />
    <Rectangle center={[-25, -55]} width={52} height={40} fill="none" />
    <RegularPolygon center={[75, -55]} radius={26} sides={6} fill="none" />
    <Star center={[175, -55]} outerRadius={26} innerRadius={11} points={5} fill="none" />

    {/* 下排：作为 Node 形状——有边界、能装文字、能连线 */}
    <Node id="nc" position={[-120, 55]} shape="circle" fill="aliceblue">
      圆
    </Node>
    <Node id="nr" position={[-25, 55]} fill="aliceblue">
      矩形
    </Node>
    <Node id="np" position={[75, 55]} shape={{ type: 'polygon', params: { sides: 6 } }} fill="aliceblue">
      多边形
    </Node>
    <Node
      id="ns"
      position={[175, 55]}
      shape={{ type: 'star', params: { points: 5, innerRadius: 11, outerRadius: 26 } }}
      fill="gold"
    />
    <Draw way={['nc', 'nr']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
