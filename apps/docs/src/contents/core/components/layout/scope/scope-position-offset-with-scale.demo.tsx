import { Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

/**
 * scope scale 下 OffsetPosition 跟着 scope 缩放：offset (dx, dy) 在 scope 局部度量
 * @description anchor 在 scope 外；scope scale 2 内的 B 用 { of:'anchor', offset:[40, 0] }——
 *   relative (40, 0) 在 scope 局部；scope scale 2 后视觉偏移 (80, 0)——B 视觉落在 anchor 右 80；
 *   右侧 ref-B 同样 offset 但 scope 外（无 scale）→ B 在 anchor 右 40。
 */
const Demo: FC = () => (
  <Layout width={460} height={220}>
    <Node id="anchor" position={[-130, 0]} shape="circle" padding={4}>anchor</Node>
    <Scope transforms={[{ kind: 'scale', x: 2 }]}>
      <Node id="B" position={{ of: 'anchor', offset: [40, 0] }} shape="circle" padding={4}>B</Node>
    </Scope>
    <Node id="B-ref" position={{ of: 'anchor', offset: [40, 64] }} shape="circle" padding={4} stroke="gray">B-ref</Node>
    <Draw way={['anchor', 'B']} arrow="->" stroke="gray" dashPattern={[4, 2]} />
    <Draw way={['anchor', 'B-ref']} arrow="->" stroke="gray" dashPattern={[4, 2]} />
  </Layout>
);

export default Demo;
