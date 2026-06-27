import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * Dynamic attach vs locked position
 * @description Two groups with identical geometry: sources a / b and target T share one
 *   horizontal line, flanking T. The left group references by plain id (auto) — endpoints land
 *   on T's near side (west / east) by direction; the right group locks to `T.north` —
 *   both pin to T's top-edge midpoint regardless of where the source is.
 */
const Demo: FC = () => (
  <Layout width={520} height={200}>
    {/* Left: auto, endpoint lands on the near side by direction */}
    <Node id="A1" position={[-210, 0]} stroke="none">a</Node>
    <Node id="T1" position={[-130, 0]} stroke="gray" dashPattern={[4, 3]}>T</Node>
    <Node id="B1" position={[-50, 0]} stroke="none">b</Node>
    <Draw way={['A1', 'T1']} arrow="->" />
    <Draw way={['B1', 'T1']} arrow="->" />
    <Node position={[-130, 80]} stroke="none" padding={0} textColor="gray">
      auto: by direction
    </Node>

    {/* Divider between the two groups */}
    <Draw way={[[0, -70], [0, 70]]} stroke="lightgray" dashPattern={[4, 4]} />

    {/* Right: locked to north, both pin to the top-edge midpoint */}
    <Node id="A2" position={[50, 0]} stroke="none">a</Node>
    <Node id="T2" position={[130, 0]} stroke="gray" dashPattern={[4, 3]}>T</Node>
    <Node id="B2" position={[210, 0]} stroke="none">b</Node>
    <Draw way={['A2', 'T2.north']} arrow="->" />
    <Draw way={['B2', 'T2.north']} arrow="->" />
    <Node position={[130, 80]} stroke="none" padding={0} textColor="gray">
      locked north: fixed
    </Node>
  </Layout>
);

export default Demo;
