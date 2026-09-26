import { FlexLayout, LayoutItem } from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Example: FC = () => (
  <Layout>
    <FlexLayout gap={12}>
      <LayoutItem kind="flex">
        <Node position={[0, 0]} text="A" />
      </LayoutItem>
      <LayoutItem kind="flex">
        <Node position={[0, 0]} text="B" />
      </LayoutItem>
    </FlexLayout>
  </Layout>
);
export default Example;
