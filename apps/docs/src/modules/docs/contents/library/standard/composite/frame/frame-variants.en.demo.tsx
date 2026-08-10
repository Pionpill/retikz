import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { Frame, FrameDescription, FrameTitle } from '@retikz/standard-react';

/** English side-by-side comparison of absent, horizontal, and vertical Frame headers */
const Demo: FC = () => (
  <Layout width={680} height={175} style={{ maxWidth: '100%', height: 'auto' }}>
    <Frame
      id="body-only"
      border={{ style: { stroke: 'lightgray', dashPattern: [5, 4], fill: 'lightgray', fillOpacity: 0.04 } }}
    >
      <Node
        position={[90, 145]}
        text="Body only"
        stroke="gray"
        fill="gray"
        fillOpacity={0.08}
        cornerRadius={4}
        padding={8}
      />
    </Frame>

    <Frame
      id="horizontal"
      border={{ style: { stroke: 'lightgray', dashPattern: [5, 4], fill: 'lightgray', fillOpacity: 0.04 } }}
    >
      <FrameTitle>Title</FrameTitle>
      <FrameDescription>Description</FrameDescription>
      <Node
        position={[335, 145]}
        text="Body"
        stroke="gray"
        fill="gray"
        fillOpacity={0.08}
        cornerRadius={4}
        padding={8}
      />
    </Frame>

    <Frame
      id="vertical"
      headerDirection="vertical"
      border={{ style: { stroke: 'lightgray', dashPattern: [5, 4], fill: 'lightgray', fillOpacity: 0.04 } }}
    >
      <FrameTitle>Title</FrameTitle>
      <FrameDescription>Description</FrameDescription>
      <Node
        position={[580, 145]}
        text="Body"
        stroke="gray"
        fill="gray"
        fillOpacity={0.08}
        cornerRadius={4}
        padding={8}
      />
    </Frame>
  </Layout>
);

export default Demo;
