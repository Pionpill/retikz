import { Layout, Node } from '@retikz/react';
import { Frame, FrameTitle } from '@retikz/standard-react/presentation';
import type { FC } from 'react';

/** 带标题与单个内容节点的最小分组 */
const Demo: FC = () => (
  <Layout>
    <Frame>
      <FrameTitle text="Group" />
      <Node position={[0, 0]} text="A" />
    </Frame>
  </Layout>
);
export default Demo;
