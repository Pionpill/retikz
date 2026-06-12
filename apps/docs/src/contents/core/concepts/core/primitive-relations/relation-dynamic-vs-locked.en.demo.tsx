import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * Dynamic attach vs locked position
 * @description Two groups with identical geometry: two source nodes sit at the target's
 *   top-left / bottom-right. The left group references by plain id (auto) — endpoints land
 *   on the target's NW / SE border by source direction; the right group locks to `.north` —
 *   endpoints pin to the top-edge midpoint regardless of where the source is.
 */
const Demo: FC = () => (
  <Layout width={520} height={240}>
    {/* Left: auto, endpoint moves with direction */}
    <Node id="T1" position={[-130, 0]}>t</Node>
    <Node id="A1" position={[-220, -80]}>a</Node>
    <Node id="B1" position={[-40, 80]}>b</Node>
    <Draw way={['A1', 'T1']} arrow="->" />
    <Draw way={['B1', 'T1']} arrow="->" />
    <Node position={[-130, 130]} stroke="none" padding={0} textColor="gray">
      auto: by direction
    </Node>

    {/* Right: locked to north, endpoint fixed */}
    <Node id="T2" position={[130, 0]}>t</Node>
    <Node id="A2" position={[40, -80]}>a</Node>
    <Node id="B2" position={[220, 80]}>b</Node>
    <Draw way={['A2', 'T2.north']} arrow="->" />
    <Draw way={['B2', 'T2.north']} arrow="->" />
    <Node position={[130, 130]} stroke="none" padding={0} textColor="gray">
      locked north: fixed
    </Node>
  </Layout>
);

export default Demo;
