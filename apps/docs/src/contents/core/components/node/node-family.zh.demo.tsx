import { Coordinate, Draw, Layout, Node, Text } from '@retikz/react';
import type { FC } from 'react';

/**
 * 节点家族三件套
 * @description 并排展示 Node（命名图元）/ Text（节点内行级样式）/ Coordinate（不可见命名点）；
 *   Coordinate 不画形状，靠两条连线汇于它来体现；caption 用淡色 stroke/fill none 的 Node。
 */
const Demo: FC = () => (
  <Layout width={560} height={260}>
    {/* Node：有形状、有文字的命名图元 */}
    <Node id="nodeDemo" position={[-190, 35]}>
      Node
    </Node>

    {/* Text：在节点内给单独一行覆盖样式 */}
    <Node id="textDemo" position={[0, 35]} align="left">
      <Text fill="darkorange" font={{ weight: 'bold' }}>
        橙色加粗
      </Text>
      普通行
    </Node>

    {/* Coordinate：不可见命名点，两条连线汇于它 */}
    <Coordinate id="coordDemo" position={[190, 55]} />
    <Node id="src1" position={[155, -10]} shape="circle" fill="gray" stroke="none" minimumSize={6} />
    <Node id="src2" position={[225, -10]} shape="circle" fill="gray" stroke="none" minimumSize={6} />
    <Draw way={['src1', 'coordDemo']} />
    <Draw way={['src2', 'coordDemo']} />

    {/* caption */}
    <Node
      id="capNode"
      position={[-190, 100]}
      stroke="none"
      fill="none"
      align="center"
      textColor="gray"
      font={{ size: 12 }}
    >
      {['Node', '命名图元']}
    </Node>
    <Node
      id="capText"
      position={[0, 100]}
      stroke="none"
      fill="none"
      align="center"
      textColor="gray"
      font={{ size: 12 }}
    >
      {['Text', '行级样式']}
    </Node>
    <Node
      id="capCoord"
      position={[190, 100]}
      stroke="none"
      fill="none"
      align="center"
      textColor="gray"
      font={{ size: 12 }}
    >
      {['Coordinate', '不可见的点']}
    </Node>
  </Layout>
);

export default Demo;
