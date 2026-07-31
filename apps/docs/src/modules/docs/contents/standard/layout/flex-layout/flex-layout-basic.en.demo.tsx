import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { FlexLayout, LayoutItem } from '@retikz/standard-react';

/** Demonstrates FlexLayout grow, gaps, and cross alignment through React authoring */
const Demo: FC = () => (
  <Layout width={420} height={150}>
    <FlexLayout
      size={{ x: { kind: 'fixed', value: 360 }, y: { kind: 'fixed', value: 96 } }}
      padding={12}
      columnGap={8}
      alignItems="center"
    >
      <LayoutItem kind="flex" itemKey="symbol" basis={48} shrink={0}>
        <Node shape="circle" position={[0, 0]} text="A" minimumSize={36} fill="#dbeafe" stroke="#2563eb" />
      </LayoutItem>
      <LayoutItem kind="flex" itemKey="label" grow={1} min={80}>
        <Node position={[0, 0]} text="Flexible label" padding={{ x: 12, y: 8 }} fill="#f8fafc" stroke="#94a3b8" />
      </LayoutItem>
      <LayoutItem kind="flex" itemKey="value" shrink={0}>
        <Node position={[0, 0]} text="42%" padding={{ x: 10, y: 8 }} fill="#dcfce7" stroke="#16a34a" />
      </LayoutItem>
    </FlexLayout>
  </Layout>
);

export default Demo;
