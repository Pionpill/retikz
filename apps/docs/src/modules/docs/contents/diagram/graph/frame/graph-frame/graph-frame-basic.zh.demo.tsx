import type { FC } from 'react';

import { GraphFrame, GraphFrameHeader, GraphFrameSection } from '@retikz/graph-react';
import { Layout, Node } from '@retikz/react';

/** 用 header 与有序 section 展示 GraphFrame 外壳 */
const Demo: FC = () => (
  <Layout width={420} height={220}>
    <GraphFrame id="order-block" padding={12} rowGap={6}>
      <GraphFrameHeader>
        <Node position={[0, 0]} text="Order" padding={{ x: 12, y: 6 }} fill="#dbeafe" stroke="#2563eb" />
      </GraphFrameHeader>
      <GraphFrameSection sectionKey="input" role="input">
        <Node position={[0, 0]} text="Input" padding={{ x: 12, y: 6 }} fill="#f8fafc" stroke="#64748b" />
      </GraphFrameSection>
      <GraphFrameSection sectionKey="output" role="output">
        <Node position={[0, 0]} text="Output" padding={{ x: 12, y: 6 }} fill="#dcfce7" stroke="#16a34a" />
      </GraphFrameSection>
    </GraphFrame>
  </Layout>
);

export default Demo;
