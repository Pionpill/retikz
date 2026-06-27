import { Circle, Coordinate, Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 通过 Coordinate 定位再连接
 * @description `<Coordinate>` 声明一个只有位置、不渲染的命名点；连线 `['a', 'via', 'b']` 像引用节点一样引用它，
 *   作为路由航点经过。灰点和 via 标注只是把这个不可见的坐标画出来示意。
 */
const Demo: FC = () => (
  <Layout width={340} height={160}>
    <Node id="A" position={[-110, 25]} stroke="none">a</Node>
    <Node id="B" position={[110, 25]} stroke="none">b</Node>
    <Coordinate id="via" position={[0, -40]} />
    <Draw way={['A', 'via', 'B']} arrow="->" />
    <Circle center={[0, -40]} radius={2.5} fill="gray" stroke="none" />
    <Node position={[0, -58]} stroke="none" padding={0} textColor="gray" font={{ size: 12 }}>
      via
    </Node>
  </Layout>
);

export default Demo;
