import type { FC } from 'react';

import { Container, ContainerHeader, ContainerSection } from '@retikz/graph-react';
import { Layout, Node } from '@retikz/react';

/** 用 header 与有序 section 展示 Container 外壳 */
const Demo: FC = () => (
  <Layout width={420} height={220}>
    <Container id="order-block" padding={12} rowGap={6}>
      <ContainerHeader>
        <Node position={[0, 0]} text="Order" padding={{ x: 12, y: 6 }} fill="#dbeafe" stroke="#2563eb" />
      </ContainerHeader>
      <ContainerSection sectionKey="input" role="input">
        <Node position={[0, 0]} text="Input" padding={{ x: 12, y: 6 }} fill="#f8fafc" stroke="#64748b" />
      </ContainerSection>
      <ContainerSection sectionKey="output" role="output">
        <Node position={[0, 0]} text="Output" padding={{ x: 12, y: 6 }} fill="#dcfce7" stroke="#16a34a" />
      </ContainerSection>
    </Container>
  </Layout>
);

export default Demo;
