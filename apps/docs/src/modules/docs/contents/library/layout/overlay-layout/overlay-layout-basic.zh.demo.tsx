import type { FC } from 'react';

import { LayoutItem, OverlayLayout } from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';

/** 展示 aligned、positioned、anchor、exclude 与稳定 zIndex */
const Demo: FC = () => (
  <Layout>
    <OverlayLayout
      size={{ x: { kind: 'fixed', value: 360 }, y: { kind: 'fixed', value: 140 } }}
      padding={12}
      justifyItems="center"
      alignItems="center"
    >
      <LayoutItem kind="overlay" zIndex={0}>
        <Node
          position={[0, 0]}
          text="结构层"
          style={{ fill: '#e0f2fe', stroke: '#0284c7' }}
          layout={{ minimumSize: { width: 230, height: 76 } }}
        />
      </LayoutItem>
      <LayoutItem
        kind="overlay"
        placement={{ kind: 'positioned', at: { x: 326, y: 18 }, anchor: { x: 1, y: 0 } }}
        sizeParticipation="exclude"
        zIndex={2}
      >
        <Node
          position={[0, 0]}
          text="置顶"
          shape="circle"
          style={{ fill: '#fee2e2', stroke: '#dc2626' }}
          layout={{ minimumSize: 42 }}
        />
      </LayoutItem>
      <LayoutItem kind="overlay" alignSelf="end" offset={{ x: 0, y: -8 }} zIndex={1}>
        <Node position={[0, 0]} text="在同一分配区域内叠放" style={{ fill: '#f8fafc', stroke: '#64748b' }} />
      </LayoutItem>
    </OverlayLayout>
  </Layout>
);

export default Demo;
