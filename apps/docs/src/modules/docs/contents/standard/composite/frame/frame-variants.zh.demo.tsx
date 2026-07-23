import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { Frame, FrameDescription, FrameTitle } from '@retikz/standard-react';

/** Frame header 缺省、横向与纵向组合的中文并列对比 */
const Demo: FC = () => (
  <Layout width={680} height={175} style={{ maxWidth: '100%', height: 'auto' }}>
    <Frame id="body-only" stroke="lightgray" dashPattern={[5, 4]} fill="lightgray" fillOpacity={0.04}>
      <Node
        position={[90, 145]}
        text="仅内容"
        stroke="gray"
        fill="gray"
        fillOpacity={0.08}
        cornerRadius={4}
        padding={8}
      />
    </Frame>

    <Frame id="horizontal" stroke="lightgray" dashPattern={[5, 4]} fill="lightgray" fillOpacity={0.04}>
      <FrameTitle>标题</FrameTitle>
      <FrameDescription>补充说明</FrameDescription>
      <Node
        position={[335, 145]}
        text="内容"
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
      stroke="lightgray"
      dashPattern={[5, 4]}
      fill="lightgray"
      fillOpacity={0.04}
    >
      <FrameTitle>标题</FrameTitle>
      <FrameDescription>补充说明</FrameDescription>
      <Node
        position={[580, 145]}
        text="内容"
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
