import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * Another Path connecting to a contour node (connectability)
 * @description A contour is still a Node — when another line targets it by id, boundaryPoint returns the exact
 *   ray ∩ contour intersection, so the endpoint lands on the contour edge (not the circumscribing AABB).
 *   Named / compass anchors fall back to the AABB; boundaryPoint is always exact.
 */
const FLAG: Array<[number, number]> = [
  [-34, 44],
  [34, 30],
  [34, -44],
  [-34, -44],
];

const Demo: FC = () => (
  <Layout width={400} height={190}>
    <Node id="src" position={[-130, 0]} fill="lightgray">
      origin
    </Node>
    <Node id="flag" position={[110, 0]} shape={{ type: 'contour', params: { points: FLAG, cornerRadius: 6 } }} fill="steelblue" />
    <Draw way={['src', 'flag']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
