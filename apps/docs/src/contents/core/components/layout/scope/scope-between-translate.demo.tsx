import { Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

/**
 * 两端点比例平移：scope 原点落到 A 与 B 的插值点
 * @description A / B 是外部参照点，scope 用 `between-translate` 放到二者 50% 位置；组内节点仍按 scope 局部坐标排布。
 */
const Demo: FC = () => (
    <Layout width={560} height={150}>
      <Node id="A" position={[0, 0]} shape="circle">A</Node>
      <Node id="B" position={[260, 40]} shape="circle">B</Node>
    <Draw way={['A', 'B']} stroke="#94a3b8" />
    <Scope transforms={[{ kind: 'between-translate', between: [{ id: 'A' }, { id: 'B' }], t: 0.5 }]}>
      <Node id="mid" position={[0, 0]} shape="circle" fill="#dbeafe">mid</Node>
      <Node position={[70, 0]} shape="rectangle">local</Node>
    </Scope>
  </Layout>
);

export default Demo;
