import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { LogicBlockBase, LogicBlockHeader, LogicBlockSection } from '@retikz/standard-react';

/** 用 header 与有序 section 展示 LogicBlockBase 外壳 */
const Demo: FC = () => (
  <Layout width={420} height={220}>
    <LogicBlockBase id="order-block" padding={12} rowGap={6}>
      <LogicBlockHeader>
        <Node position={[0, 0]} text="Order" padding={{ x: 12, y: 6 }} fill="#dbeafe" stroke="#2563eb" />
      </LogicBlockHeader>
      <LogicBlockSection sectionKey="input" role="input">
        <Node position={[0, 0]} text="Input" padding={{ x: 12, y: 6 }} fill="#f8fafc" stroke="#64748b" />
      </LogicBlockSection>
      <LogicBlockSection sectionKey="output" role="output">
        <Node position={[0, 0]} text="Output" padding={{ x: 12, y: 6 }} fill="#dcfce7" stroke="#16a34a" />
      </LogicBlockSection>
    </LogicBlockBase>
  </Layout>
);

export default Demo;
