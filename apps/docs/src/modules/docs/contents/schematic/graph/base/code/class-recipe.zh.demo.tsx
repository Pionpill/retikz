import type { FC } from 'react';

import { GraphFrame, GraphFrameHeader, GraphFrameSection } from '@retikz/graph-react';
import { Layout, Node } from '@retikz/react';

/** 只存在于文档的 Class recipe，使用 block 与 typed section */
const Demo: FC = () => (
  <Layout width={480} height={230}>
    <GraphFrame id="class-recipe" padding={14} rowGap={4}>
      <GraphFrameHeader>
        <Node position={[0, 0]} text="Account" fill="#dbeafe" stroke="#2563eb" />
      </GraphFrameHeader>
      <GraphFrameSection sectionKey="fields" role="fields">
        <Node position={[0, 0]} text="+ id: string\n+ status: State" />
      </GraphFrameSection>
      <GraphFrameSection sectionKey="methods" role="methods">
        <Node position={[0, 0]} text="+ activate()\n+ close()" />
      </GraphFrameSection>
    </GraphFrame>
  </Layout>
);

export default Demo;
