import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { Frame, FrameDescription, FrameTitle } from '@retikz/standard-react';

/** Frame 标题、说明与 Core Node body 的最小中文示例 */
const Demo: FC = () => (
  <Layout width={360} height={180} style={{ maxWidth: '100%', height: 'auto' }}>
    <Frame id="contract">
      <FrameTitle>扩展契约</FrameTitle>
      <FrameDescription>内置能力与自定义能力共用 Definition</FrameDescription>
      <Node position={[120, 145]} text="内置能力" />
      <Node position={[245, 145]} text="自定义能力" />
    </Frame>
  </Layout>
);

export default Demo;
