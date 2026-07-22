import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { Frame } from '@retikz/standard-react';

const Demo: FC = () => (
  <Layout width={320} height={180}>
    <Frame id="definition-contract" label="XxxDefinition" gap={16} border={{ dashPattern: [5, 3] }}>
      <Node position={[100, 90]} text="BUILTIN_*" fill="#f8fafc" />
      <Node position={[220, 90]} text="defineXxx(custom)" fill="#f8fafc" />
    </Frame>
  </Layout>
);

export default Demo;
