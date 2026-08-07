import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { LogicBlockBase, LogicBlockHeader, LogicBlockSection } from '@retikz/standard-react';

/** 只存在于文档的 Class recipe，使用 block 与 typed section */
const Demo: FC = () => (
  <Layout width={480} height={230}>
    <LogicBlockBase id="class-recipe" padding={14} rowGap={4}>
      <LogicBlockHeader>
        <Node position={[0, 0]} text="Account" fill="#dbeafe" stroke="#2563eb" />
      </LogicBlockHeader>
      <LogicBlockSection sectionKey="fields" role="fields">
        <Node position={[0, 0]} text="+ id: string\n+ status: State" />
      </LogicBlockSection>
      <LogicBlockSection sectionKey="methods" role="methods">
        <Node position={[0, 0]} text="+ activate()\n+ close()" />
      </LogicBlockSection>
    </LogicBlockBase>
  </Layout>
);

export default Demo;
