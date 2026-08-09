import type { FC } from 'react';

import { Callout, Stage } from '@retikz/notation-react';
import { Layout, Node, Scope } from '@retikz/react';

/** Demonstrates side placement, tangent offset, and optional Callout leaders */
const Demo: FC = () => (
  <Layout width={560} height={240}>
    <Scope transforms={[{ kind: 'translate', x: 220, y: 104 }]}>
      <Stage id="callout-target" position={[0, 0]}>
        Target
      </Stage>
    </Scope>
    <Callout id="callout-right" target={{ id: 'callout-target' }} placement={{ side: 'right', gap: 14, offset: -10 }}>
      <Node position={[0, 0]} text="Leader" padding={{ x: 10, y: 6 }} fill="#fef3c7" stroke="#d97706" />
    </Callout>
    <Callout id="callout-top" target={{ id: 'callout-target' }} placement={{ side: 'top', gap: 10 }} leader={false}>
      <Node position={[0, 0]} text="No leader" padding={{ x: 10, y: 6 }} fill="#e0e7ff" stroke="#4f46e5" />
    </Callout>
  </Layout>
);

export default Demo;
