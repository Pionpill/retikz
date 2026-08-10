import type { FC } from 'react';

import { GridLayout, LayoutItem } from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';

/** Demonstrates explicit tracks, fractions, spans, and auto placement */
const Demo: FC = () => (
  <Layout width={460} height={210}>
    <GridLayout
      columns={[
        { kind: 'fixed', value: 92 },
        { kind: 'fraction', factor: 1 },
        { kind: 'fraction', factor: 2 },
      ]}
      rows={[
        { kind: 'fixed', value: 58 },
        { kind: 'fixed', value: 58 },
      ]}
      size={{ x: { kind: 'fixed', value: 400 }, y: { kind: 'fixed', value: 146 } }}
      padding={10}
      columnGap={8}
      rowGap={8}
    >
      <LayoutItem kind="grid" itemKey="title" column={{ start: 0, span: 2 }}>
        <Node position={[0, 0]} text="Two-column span" fill="#dbeafe" stroke="#2563eb" />
      </LayoutItem>
      <LayoutItem kind="grid" itemKey="metric" column={{ start: 2 }} row={{ start: 0 }}>
        <Node position={[0, 0]} text="2fr" fill="#dcfce7" stroke="#16a34a" />
      </LayoutItem>
      <LayoutItem kind="grid" itemKey="auto-a">
        <Node position={[0, 0]} text="Auto A" fill="#fef3c7" stroke="#d97706" />
      </LayoutItem>
      <LayoutItem kind="grid" itemKey="auto-b">
        <Node position={[0, 0]} text="Auto B" fill="#f3e8ff" stroke="#9333ea" />
      </LayoutItem>
    </GridLayout>
  </Layout>
);

export default Demo;
