import { Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * Node `label` outside a node border
 * @description Single object or array form; `position` accepts 8-direction enum or numeric angle (TikZ `label=30:foo`); `font` / `textColor` inherit from the node when omitted.
 */
const Demo: FC = () => (
  <TikZ width={500} height={260}>
    {/* Single label, default position='above' */}
    <Node id="A" position={[-160, 0]} label={{ text: 'simple label' }}>A</Node>
    {/* Multiple labels around different directions */}
    <Node
      id="B"
      shape="circle"
      position={[0, 0]}
      label={[
        { text: 'top', position: 'above' },
        { text: 'right', position: 'right' },
        { text: 'bottom-left', position: 'below-left' },
      ]}
    >B</Node>
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
    >C</Node>
  </TikZ>
);

export default Demo;
