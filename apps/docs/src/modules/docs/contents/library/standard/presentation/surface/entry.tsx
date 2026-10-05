import { Layout, Node } from '@retikz/react';
import { Surface } from '@retikz/standard-react/presentation';
import type { FC } from 'react';

/** 唯一子节点及其外侧留白和边框 */
const Demo: FC = () => (
  <Layout>
    <Surface padding={16} border={{ stroke: 'currentColor', strokeOpacity: 0.65 }}>
      <Node position={[0, 0]} text="A" />
    </Surface>
  </Layout>
);
export default Demo;
