import { Coordinate, Draw, Layout, Node, Text } from '@retikz/react';
import type { FC } from 'react';

/**
 * The node family at a glance
 * @description Side by side: Node (named primitive) / Text (per-line style inside a node) /
 *   Coordinate (invisible named point). Coordinate draws nothing — two lines converging on it
 *   reveal where it is. Captions are faint Nodes with stroke/fill none.
 */
const Demo: FC = () => (
  <Layout width={560} height={260}>
    {/* Node: a named primitive with shape and text */}
    <Node id="nodeDemo" position={[-190, 35]}>
      Node
    </Node>

    {/* Text: override the style of a single line inside a node */}
    <Node id="textDemo" position={[0, 35]} align="left">
      <Text fill="orange" font={{ weight: 'bold' }}>
        bold orange
      </Text>
      plain line
    </Node>

    {/* Coordinate: an invisible named point; two lines converge on it */}
    <Coordinate id="coordDemo" position={[190, 55]} />
    <Node id="src1" position={[155, -10]} shape="circle" fill="gray" stroke="none" minimumSize={6} />
    <Node id="src2" position={[225, -10]} shape="circle" fill="gray" stroke="none" minimumSize={6} />
    <Draw way={['src1', 'coordDemo']} />
    <Draw way={['src2', 'coordDemo']} />

    {/* captions */}
    <Node
      id="capNode"
      position={[-190, 100]}
      stroke="none"
      fill="none"
      align="center"
      textColor="gray"
      font={{ size: 12 }}
    >
      {['Node', 'named primitive']}
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
      {['Text', 'per-line style']}
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
      {['Coordinate', 'invisible point']}
    </Node>
  </Layout>
);

export default Demo;
