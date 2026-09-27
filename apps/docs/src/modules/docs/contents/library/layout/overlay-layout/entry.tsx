import { OverlayLayout, LayoutItem } from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Example: FC = () => (
  <Layout>
    <OverlayLayout size={{ x: { kind: 'fixed', value: 100 }, y: { kind: 'fixed', value: 60 } }}>
      <LayoutItem kind="overlay">
        <Node position={[0, 0]} text="A" />
      </LayoutItem>
      <LayoutItem kind="overlay" offset={{ x: 30, y: 20 }}>
        <Node position={[0, 0]} text="B" />
      </LayoutItem>
    </OverlayLayout>
  </Layout>
);
export default Example;
