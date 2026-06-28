import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

/**
 * Node `label` outside a node border
 * @description Single object or array form; `position` accepts 8-direction enum, center, or numeric angle (TikZ `label=30:foo`); `font` / `textColor` inherit from the node when omitted.
 */
const Demo: FC = () => (
  <Layout width={500} height={260}>
    {/* Single label, default position='above' */}
    <Node id="A" position={[-160, 0]} label={{ text: 'simple label' }}>
      A
    </Node>
    {/* Multiple labels, including a center label */}
    <Node
      id="B"
      shape="circle"
      color="white"
      fill="#2563eb"
      position={[0, 0]}
      label={[
        { text: 'center', position: 'center', textColor: 'currentColor' },
        { text: 'top', position: 'above', textColor: '#0f172a' },
        { text: 'right', position: 'right', textColor: '#0f172a' },
        { text: 'bottom-left', position: 'below-left', textColor: '#0f172a' },
      ]}
    />
    {/* Numeric angles (retikz polar: 0° = +x, 90° = +y, screen-down) */}
    <Node
      id="C"
      shape="diamond"
      position={[180, 0]}
      label={[
        { text: '0°', position: 0, textColor: 'crimson' },
        { text: '120°', position: 120, textColor: 'crimson' },
        { text: '-110°', position: -110, textColor: 'crimson' },
      ]}
    >
      C
    </Node>
  </Layout>
);

export default Demo;
