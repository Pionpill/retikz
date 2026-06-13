import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * step.to with OffsetPosition
 * @description path endpoint = `{ of, offset }`, with three base shapes: node id (dark), Cartesian literal (mid-gray), polar expression (light gray). Draw way items accept OffsetPosition directly.
 */
const Demo: FC = () => (
  <Layout width={420} height={200} nodeDefault={{ stroke: 'gray', dashed: true }}>
    <Node id="A" position={[-140, 0]}>a</Node>
    <Draw way={['A', { of: 'A', offset: [120, -50] }]} arrow="->" />
    <Draw
      way={['A', { of: [120, 60], offset: [0, 0] }]}
      arrow="->"
      stroke="gray"
    />
    <Draw
      way={[
        'A',
        {
          of: { origin: 'A', angle: 0, radius: 160 },
          offset: [0, 50],
        },
      ]}
      arrow="->"
      stroke="lightgray"
    />
  </Layout>
);

export default Demo;
