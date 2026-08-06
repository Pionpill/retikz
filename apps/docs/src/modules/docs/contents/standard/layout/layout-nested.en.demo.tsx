import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { FlexLayout, GridLayout, LayoutItem, OverlayLayout } from '@retikz/standard-react';

/** Demonstrates recursive composition because every layout container is an ordinary IRChild */
const Demo: FC = () => (
  <Layout width={500} height={260} inspect={{ layout: true }}>
    <FlexLayout
      size={{ x: { kind: 'fixed', value: 430 }, y: { kind: 'fixed', value: 190 } }}
      direction="column"
      padding={12}
      gap={10}
    >
      <LayoutItem kind="flex" itemKey="header" shrink={0}>
        <Node position={[0, 0]} text="Layout containers compose recursively" fill="#e0f2fe" stroke="#0284c7" />
      </LayoutItem>
      <LayoutItem kind="flex" itemKey="body" grow={1} min={90}>
        <GridLayout
          columns={[
            { kind: 'fraction', factor: 1 },
            { kind: 'fraction', factor: 1 },
          ]}
          columnGap={10}
        >
          <LayoutItem kind="grid" itemKey="left">
            <Node position={[0, 0]} text="Grid cell" fill="#dcfce7" stroke="#16a34a" />
          </LayoutItem>
          <LayoutItem kind="grid" itemKey="right">
            <OverlayLayout size={{ y: { kind: 'fixed', value: 86 } }}>
              <LayoutItem kind="overlay" itemKey="base">
                <Node
                  position={[0, 0]}
                  text="Overlay"
                  minimumSize={{ width: 150, height: 64 }}
                  fill="#f3e8ff"
                  stroke="#9333ea"
                />
              </LayoutItem>
              <LayoutItem
                kind="overlay"
                itemKey="badge"
                placement={{ kind: 'positioned', at: { x: 142, y: 4 }, anchor: { x: 1, y: 0 } }}
                sizeParticipation="exclude"
                zIndex={1}
              >
                <Node position={[0, 0]} text="3" shape="circle" minimumSize={26} fill="#fee2e2" stroke="#dc2626" />
              </LayoutItem>
            </OverlayLayout>
          </LayoutItem>
        </GridLayout>
      </LayoutItem>
    </FlexLayout>
  </Layout>
);

export default Demo;
