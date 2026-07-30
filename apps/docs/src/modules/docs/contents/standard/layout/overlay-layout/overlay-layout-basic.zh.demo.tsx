import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { LayoutItem, OverlayLayout } from '@retikz/standard-react';

/** 展示 aligned、positioned、anchor、exclude 与稳定 zIndex */
const Demo: FC = () => (
  <Layout width={440} height={210}>
    <OverlayLayout
      size={{ x: { kind: 'fixed', value: 360 }, y: { kind: 'fixed', value: 140 } }}
      padding={12}
      justifyItems="center"
      alignItems="center"
    >
      <LayoutItem kind="overlay" itemKey="base" zIndex={0}>
        <Node
          position={[0, 0]}
          text="结构层"
          minimumSize={{ width: 230, height: 76 }}
          fill="#e0f2fe"
          stroke="#0284c7"
        />
      </LayoutItem>
      <LayoutItem
        kind="overlay"
        itemKey="badge"
        placement={{ kind: 'positioned', at: { x: 326, y: 18 }, anchor: { x: 1, y: 0 } }}
        sizeParticipation="exclude"
        zIndex={2}
      >
        <Node position={[0, 0]} text="置顶" shape="circle" minimumSize={42} fill="#fee2e2" stroke="#dc2626" />
      </LayoutItem>
      <LayoutItem kind="overlay" itemKey="caption" alignSelf="end" offset={{ x: 0, y: -8 }} zIndex={1}>
        <Node position={[0, 0]} text="同一 allocation 内叠放" fill="#f8fafc" stroke="#64748b" />
      </LayoutItem>
    </OverlayLayout>
  </Layout>
);

export default Demo;
