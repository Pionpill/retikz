import { Coordinate, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

/**
 * 极坐标平移：scope 以 hub 为 origin，按 angle / radius 偏移
 * @description hub 居中，两组 cluster 用 angle 0° / 180° + radius 150 落到 hub 左右两侧；用极坐标声明等价于左 / 右 cartesian translate，但表达方式更接近"从 hub 出发的方向 + 距离"。
 */
const Demo: FC = () => (
  <Layout width={560} height={120}>
    <Coordinate id="hub" position={[0, 0]} />
    <Scope transforms={[{ kind: 'polar-translate', origin: 'hub', angle: 0, radius: 150 }]}>
      <Node position={[0, 0]} shape="circle">1</Node>
      <Node position={[60, 0]} shape="circle">2</Node>
    </Scope>
    <Scope transforms={[{ kind: 'polar-translate', origin: 'hub', angle: 180, radius: 150 }]}>
      <Node position={[0, 0]} shape="circle">1</Node>
      <Node position={[60, 0]} shape="circle">2</Node>
    </Scope>
    <Node position={[0, 0]} shape="circle" padding={4} stroke="gray">hub</Node>
  </Layout>
);

export default Demo;
