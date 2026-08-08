import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { LogicFrame, LogicFrameHeader, LogicFrameSection } from '@retikz/standard-react';

/** Documentation-only Class recipe using a block and typed sections */
const Demo: FC = () => (
  <Layout width={480} height={230}>
    <LogicFrame id="class-recipe" padding={14} rowGap={4}>
      <LogicFrameHeader>
        <Node position={[0, 0]} text="Account" fill="#dbeafe" stroke="#2563eb" />
      </LogicFrameHeader>
      <LogicFrameSection sectionKey="fields" role="fields">
        <Node position={[0, 0]} text="+ id: string\n+ status: State" />
      </LogicFrameSection>
      <LogicFrameSection sectionKey="methods" role="methods">
        <Node position={[0, 0]} text="+ activate()\n+ close()" />
      </LogicFrameSection>
    </LogicFrame>
  </Layout>
);

export default Demo;
