import type { FC } from 'react';

import { LayoutItem } from '@retikz/layout-react';
import {
  InspectFlexLayout,
  InspectGridLayout,
  InspectOverlayLayout,
  LayoutInspectLayout,
} from '@retikz/layout-react/inspect';
import { Layout, Node } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/preview';

/** 展示三种布局容器可作为普通 IRChild 递归组合 */
const NestedContent: FC = () => (
  <InspectFlexLayout
    size={{ x: { kind: 'fixed', value: 430 }, y: { kind: 'fixed', value: 190 } }}
    direction="column"
    padding={12}
    gap={10}
  >
    <LayoutItem kind="flex" itemKey="header" shrink={0}>
      <Node position={[0, 0]} text="布局容器可以递归组合" fill="#e0f2fe" stroke="#0284c7" />
    </LayoutItem>
    <LayoutItem kind="flex" itemKey="body" grow={1} min={90}>
      <InspectGridLayout
        columns={[
          { kind: 'fraction', factor: 1 },
          { kind: 'fraction', factor: 1 },
        ]}
        columnGap={10}
      >
        <LayoutItem kind="grid" itemKey="left">
          <Node position={[0, 0]} text="网格单元" fill="#dcfce7" stroke="#16a34a" />
        </LayoutItem>
        <LayoutItem kind="grid" itemKey="right">
          <InspectOverlayLayout size={{ y: { kind: 'fixed', value: 86 } }}>
            <LayoutItem kind="overlay" itemKey="base">
              <Node
                position={[0, 0]}
                text="叠加层"
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
          </InspectOverlayLayout>
        </LayoutItem>
      </InspectGridLayout>
    </LayoutItem>
  </InspectFlexLayout>
);

/** 展示三种布局容器可作为普通 IRChild 递归组合 */
const Demo: FC = () => (
  <LayoutInspectLayout width={500} height={260}>
    <NestedContent />
  </LayoutInspectLayout>
);

/** canonical IR 只保存布局输入，不保存运行时 Inspector 选择 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => (
    <Layout width={500} height={260}>
      <NestedContent />
    </Layout>
  ),
} satisfies PreviewSourceConfig;

export default Demo;
