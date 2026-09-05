import type { FC } from 'react';

import { Coordinate, Draw, Layout, Node, Text } from '@retikz/react';

/**
 * 节点家族职责图
 * @description 用统一无框节点展示 Node、Text 与 Coordinate 的职责；Coordinate 不画形状，
 *   通过两条连线汇于同一点表现其位置
 */
const Demo: FC = () => (
  <Layout>
    {/* Node：有形状、有文字的命名图元 */}
    <Node id="nodeDemo" position={[-190, -5]} style={{ stroke: 'none', fill: 'none', font: { weight: 'bold' } }}>
      Node
    </Node>

    {/* Text：在节点内给单独一行覆盖样式 */}
    <Node id="textDemo" position={[0, -5]} style={{ stroke: 'none', fill: 'none' }} layout={{ align: 'middle' }}>
      <Text fill="darkorange" font={{ weight: 'bold' }}>
        Text
      </Text>
      行级样式
    </Node>

    {/* Coordinate：不可见命名点，两条连线汇于它 */}
    <Coordinate id="coordDemo" position={[190, 5]} />
    <Coordinate id="src1" position={[155, -40]} />
    <Coordinate id="src2" position={[225, -40]} />
    <Draw way={['src1', 'coordDemo']} style={{ stroke: 'gray' }} />
    <Draw way={['src2', 'coordDemo']} style={{ stroke: 'gray' }} />

    {/* caption */}
    <Node
      id="capNode"
      position={[-190, 30]}
      style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}
      layout={{ align: 'middle' }}
    >
      Node · 可见命名图元
    </Node>
    <Node
      id="capText"
      position={[0, 35]}
      style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}
      layout={{ align: 'middle' }}
    >
      Text · 节点内整行覆盖
    </Node>
    <Node
      id="capCoord"
      position={[190, 35]}
      style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}
      layout={{ align: 'middle' }}
    >
      Coordinate · 不可见命名点
    </Node>
  </Layout>
);

export default Demo;
