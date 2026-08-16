import type { FC } from 'react';

import { Container, ContainerHeader, ContainerSection } from '@retikz/graph-react';
import { Layout, Node } from '@retikz/react';

/** Documentation-only Class recipe using a block and typed sections */
const Demo: FC = () => (
  <Layout width={480} height={230}>
    <Container id="class-recipe" padding={14} rowGap={4}>
      <ContainerHeader>
        <Node position={[0, 0]} text="Account" fill="#dbeafe" stroke="#2563eb" />
      </ContainerHeader>
      <ContainerSection sectionKey="fields" role="fields">
        <Node position={[0, 0]} text="+ id: string\n+ status: State" />
      </ContainerSection>
      <ContainerSection sectionKey="methods" role="methods">
        <Node position={[0, 0]} text="+ activate()\n+ close()" />
      </ContainerSection>
    </Container>
  </Layout>
);

export default Demo;
