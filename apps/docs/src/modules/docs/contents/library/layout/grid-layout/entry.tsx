import { GridLayout, LayoutItem } from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Example: FC = () => (
  <Layout>
    <GridLayout
      columns={[
        { kind: 'fixed', value: 80 },
        { kind: 'fixed', value: 80 },
      ]}
      columnGap={12}
    >
      <LayoutItem kind="grid">
        <Node position={[0, 0]} text="A" />
      </LayoutItem>
      <LayoutItem kind="grid">
        <Node position={[0, 0]} text="B" />
      </LayoutItem>
    </GridLayout>
  </Layout>
);
export default Example;
