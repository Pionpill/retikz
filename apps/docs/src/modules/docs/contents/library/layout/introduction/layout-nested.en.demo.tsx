import {
  FlexLayoutItem,
  GridLayoutItem,
  OverlayLayoutItem,
  FlexLayout,
  GridLayout,
  OverlayLayout,
} from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import type { PreviewSourceConfig } from '@/modules/docs/preview';

/** Demonstrates recursive composition because every layout container is an ordinary IRChild */
const NestedContent: FC = () => (
  <FlexLayout
    size={{ x: { kind: 'fixed', value: 430 }, y: { kind: 'fixed', value: 190 } }}
    direction="column"
    padding={12}
    gap={10}
  >
    <FlexLayoutItem itemKey="header" shrink={0}>
      <Node text="Layout containers compose recursively" style={{ fill: '#e0f2fe', stroke: '#0284c7' }} />
    </FlexLayoutItem>
    <FlexLayoutItem itemKey="body" grow={1} min={90}>
      <GridLayout
        columns={[
          { kind: 'fraction', factor: 1 },
          { kind: 'fraction', factor: 1 },
        ]}
        columnGap={10}
      >
        <GridLayoutItem itemKey="left">
          <Node text="Grid cell" style={{ fill: '#dcfce7', stroke: '#16a34a' }} />
        </GridLayoutItem>
        <GridLayoutItem itemKey="right">
          <OverlayLayout size={{ y: { kind: 'fixed', value: 86 } }}>
            <OverlayLayoutItem itemKey="base">
              <Node
                text="Overlay"
                style={{ fill: '#f3e8ff', stroke: '#9333ea' }}
                layout={{ minimumSize: { width: 150, height: 64 } }}
              />
            </OverlayLayoutItem>
            <OverlayLayoutItem
              itemKey="badge"
              placement={{ kind: 'positioned', at: { x: 142, y: 4 }, anchor: { x: 1, y: 0 } }}
              sizeParticipation="exclude"
              zIndex={1}
            >
              <Node
                text="3"
                shape="circle"
                style={{ fill: '#fee2e2', stroke: '#dc2626' }}
                layout={{ minimumSize: 26 }}
              />
            </OverlayLayoutItem>
          </OverlayLayout>
        </GridLayoutItem>
      </GridLayout>
    </FlexLayoutItem>
  </FlexLayout>
);

/** Demonstrates recursive composition because every layout container is an ordinary IRChild */
const Demo: FC = () => (
  <Layout>
    <NestedContent />
  </Layout>
);

/** canonical IR keeps layout inputs and excludes runtime Inspector selection */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => (
    <Layout>
      <NestedContent />
    </Layout>
  ),
} satisfies PreviewSourceConfig;

export default Demo;
