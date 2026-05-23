import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

/**
 * scope rotate 下 polar referent：referent 取全局，relative (angle/radius) 在 scope 局部度量
 * @description hub 在 scope 外（全局原点）；scope rotate 45 度内的 orbit 用 polar { origin:'hub', angle:0, radius:80 }——
 *   relative 在 scope 局部 = 右 80；scope rotate 45 后视觉投影到全局 ≈ (56.6, 56.6)。
 *   对比 scope 外（无 rotate）的 ref-orbit：同样 polar 落在 hub 全局右 80 = (80, 0)。
 */
const Demo: FC = () => (
  <Layout width={400} height={200}>
    <Node id="hub" position={[0, 0]} shape="circle" padding={4}>hub</Node>
    <Scope transforms={[{ kind: 'rotate', degrees: 45 }]}>
      <Node id="orbit" position={{ origin: 'hub', angle: 0, radius: 80 }} shape="circle" padding={4}>orbit</Node>
    </Scope>
    <Node id="ref" position={{ origin: 'hub', angle: 0, radius: 80 }} shape="circle" padding={4} stroke="gray">ref</Node>
    <Path arrow="->" stroke="gray" dashPattern={[4, 2]}>
      <Step kind="move" to="hub" />
      <Step to="orbit" />
    </Path>
    <Path arrow="->" stroke="gray" dashPattern={[4, 2]}>
      <Step kind="move" to="hub" />
      <Step to="ref" />
    </Path>
  </Layout>
);

export default Demo;
