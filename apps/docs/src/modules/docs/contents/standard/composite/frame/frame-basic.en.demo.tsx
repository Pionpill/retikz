import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { Frame, FrameDescription, FrameTitle } from '@retikz/standard-react';

/** Minimal English Frame example with a title, description, and Core Node body */
const Demo: FC = () => (
  <Layout width={360} height={180} style={{ maxWidth: '100%', height: 'auto' }}>
    <Frame id="contract">
      <FrameTitle>Extension contract</FrameTitle>
      <FrameDescription>Builtins and extensions share one Definition</FrameDescription>
      <Node position={[120, 145]} text="Builtin" />
      <Node position={[245, 145]} text="Extension" />
    </Frame>
  </Layout>
);

export default Demo;
