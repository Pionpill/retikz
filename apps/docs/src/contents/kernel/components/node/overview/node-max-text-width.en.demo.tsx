import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * maxTextWidth wrap threshold
 * @description Left: no maxTextWidth, the long label runs on one line; right: maxTextWidth wraps on word
 *   boundaries past the threshold and the box shrinks to the content.
 */
const Demo: FC = () => (
  <Layout width={560} height={200}>
    <Node id="wide" position={[-130, 20]} fill="lightgray" stroke="mediumpurple">
      a longer node label
    </Node>
    <Node id="wrapped" position={[150, 20]} maxTextWidth={90} fill="lightgray" stroke="green">
      a longer node label
    </Node>
    <Node position={[-130, 76]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      no maxTextWidth
    </Node>
    <Node position={[150, 76]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      maxTextWidth=90
    </Node>
  </Layout>
);

export default Demo;
