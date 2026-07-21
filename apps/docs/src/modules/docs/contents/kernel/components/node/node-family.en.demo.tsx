import type { FC } from 'react';

import { Coordinate, Draw, Layout, Node, Text } from '@retikz/react';

/**
 * Node family responsibility map
 * @description Uses one unframed visual language for Node, Text, and Coordinate; Coordinate draws
 *   nothing, so two lines converging on the same point reveal its position
 */
const Demo: FC = () => (
  <Layout width={560} height={120} style={{ maxWidth: '100%', height: 'auto' }}>
    {/* Node: a named primitive with shape and text */}
    <Node id="nodeDemo" position={[-190, -5]} stroke="none" fill="none" font={{ weight: 'bold' }}>
      Node
    </Node>

    {/* Text: override the style of a single line inside a node */}
    <Node id="textDemo" position={[0, -5]} align="middle" stroke="none" fill="none">
      <Text fill="darkorange" font={{ weight: 'bold' }}>
        Text
      </Text>
      per-line style
    </Node>

    {/* Coordinate: an invisible named point; two lines converge on it */}
    <Coordinate id="coordDemo" position={[190, 5]} />
    <Coordinate id="src1" position={[155, -40]} />
    <Coordinate id="src2" position={[225, -40]} />
    <Draw way={['src1', 'coordDemo']} stroke="gray" />
    <Draw way={['src2', 'coordDemo']} stroke="gray" />

    {/* captions */}
    <Node
      id="capNode"
      position={[-190, 30]}
      stroke="none"
      fill="none"
      align="middle"
      textColor="gray"
      font={{ size: 12 }}
    >
      Node · visible named primitive
    </Node>
    <Node id="capText" position={[0, 35]} stroke="none" fill="none" align="middle" textColor="gray" font={{ size: 12 }}>
      Text · whole-line override
    </Node>
    <Node
      id="capCoord"
      position={[190, 35]}
      stroke="none"
      fill="none"
      align="middle"
      textColor="gray"
      font={{ size: 12 }}
    >
      Coordinate · invisible point
    </Node>
  </Layout>
);

export default Demo;
