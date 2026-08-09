import type { FC } from 'react';

import { LogicFrame, LogicFrameHeader, LogicFrameSection } from '@retikz/notation-react';
import { Layout, Node } from '@retikz/react';

/** Demonstrates a LogicFrame shell with a header and ordered sections */
const Demo: FC = () => (
  <Layout width={420} height={220}>
    <LogicFrame id="order-block" padding={12} rowGap={6}>
      <LogicFrameHeader>
        <Node position={[0, 0]} text="Order" padding={{ x: 12, y: 6 }} fill="#dbeafe" stroke="#2563eb" />
      </LogicFrameHeader>
      <LogicFrameSection sectionKey="input" role="input">
        <Node position={[0, 0]} text="Input" padding={{ x: 12, y: 6 }} fill="#f8fafc" stroke="#64748b" />
      </LogicFrameSection>
      <LogicFrameSection sectionKey="output" role="output">
        <Node position={[0, 0]} text="Output" padding={{ x: 12, y: 6 }} fill="#dcfce7" stroke="#16a34a" />
      </LogicFrameSection>
    </LogicFrame>
  </Layout>
);

export default Demo;
