import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * pin: a label with a leader line
 * @description Draws a leader from the node border to the label; solid pin on the right, dashed pin
 *   (leader.dashPattern) at the upper-left.
 */
const Demo: FC = () => (
  <Layout width={460} height={240}>
    <Node
      id="q0"
      position={[0, 10]}
      shape="circle"
      fill="#eef2ff"
      stroke="#8893d8"
      minimumSize={40}
      label={[
        { text: 'entry state', position: 'right', distance: 34, pin: true },
        {
          text: 'initial',
          position: 'above-left',
          distance: 34,
          pin: { stroke: '#999999', dashPattern: [3, 2] },
        },
      ]}
    >
      q0
    </Node>
  </Layout>
);

export default Demo;
