import type { FC } from 'react';

import { FlexLayout, LayoutItem } from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';

/** 用 React authoring 展示 FlexLayout 的 grow、gap 与 cross alignment */
const Demo: FC = () => (
  <Layout>
    <FlexLayout
      size={{ x: { kind: 'fixed', value: 360 }, y: { kind: 'fixed', value: 96 } }}
      padding={12}
      gap={{ column: 8, row: 4 }}
      alignItems="center"
    >
      <LayoutItem kind="flex" basis={48} shrink={0}>
        <Node
          shape="circle"
          position={[0, 0]}
          text="A"
          style={{ fill: '#dbeafe', stroke: '#2563eb' }}
          layout={{ minimumSize: 36 }}
        />
      </LayoutItem>
      <LayoutItem kind="flex" grow={1} min={80}>
        <Node
          position={[0, 0]}
          text="可伸缩标签"
          style={{ fill: '#f8fafc', stroke: '#94a3b8' }}
          layout={{ padding: { x: 12, y: 8 } }}
        />
      </LayoutItem>
      <LayoutItem kind="flex" shrink={0}>
        <Node
          position={[0, 0]}
          text="42%"
          style={{ fill: '#dcfce7', stroke: '#16a34a' }}
          layout={{ padding: { x: 10, y: 8 } }}
        />
      </LayoutItem>
    </FlexLayout>
  </Layout>
);

export default Demo;
