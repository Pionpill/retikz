import { Circle, Draw, Layout, Node, Rectangle, RegularPolygon, Star } from '@retikz/react';
import type { FC } from 'react';

/**
 * The two faces of the shape family
 * @description Top row: the same shapes drawn as Path graphics (Sugar) — pure outlines; bottom row: the same shapes as
 *   Node shapes with a boundary that holds text and accepts edges. Left gray labels name the two faces; one gray arrow
 *   on the bottom row hints that Node shapes are connectable. Captions / row labels use gray stroke/fill-none text.
 */
const Demo: FC = () => (
  <Layout width={560} height={240}>
    {/* Row labels */}
    <Node id="rowPath" position={[-235, -55]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      Path line
    </Node>
    <Node id="rowNode" position={[-235, 55]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      Node boundary
    </Node>

    {/* Top row: as Path graphics (Sugar) — pure outlines */}
    <Circle center={[-120, -55]} radius={24} fill="none" />
    <Rectangle center={[-25, -55]} width={52} height={40} fill="none" />
    <RegularPolygon center={[75, -55]} radius={26} sides={6} fill="none" />
    <Star center={[175, -55]} outerRadius={26} innerRadius={11} points={5} fill="none" />

    {/* Bottom row: as Node shapes — boundary holds text and accepts edges */}
    <Node id="nc" position={[-120, 55]} shape="circle" fill="aliceblue">
      circle
    </Node>
    <Node id="nr" position={[-25, 55]} fill="aliceblue">
      rect
    </Node>
    <Node id="np" position={[75, 55]} shape={{ type: 'polygon', params: { sides: 6 } }} fill="aliceblue">
      polygon
    </Node>
    <Node
      id="ns"
      position={[175, 55]}
      shape={{ type: 'star', params: { points: 5, innerRadius: 11, outerRadius: 26 } }}
      fill="gold"
    />
    <Draw way={['nc', 'nr']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
