import type { FC } from 'react';

import { FLEX_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';
import { LayoutItem } from '@retikz/layout-react';
import { InspectFlexLayout, LayoutInspectLayout, LayoutInspectScope } from '@retikz/layout-react/inspect';
import { Layout, Node, Scope } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/preview';

const SceneContents: FC = () => (
  <>
    <Scope transforms={[{ kind: 'translate', x: 20, y: 34 }]}>
      <InspectFlexLayout size={{ x: { kind: 'fixed', value: 220 }, y: { kind: 'fixed', value: 110 } }} padding={12}>
        <LayoutItem kind="flex" itemKey="enabled-a" grow={1}>
          <Node position={[0, 0]} text="A1" fill="#dbeafe" stroke="#2563eb" />
        </LayoutItem>
        <LayoutItem kind="flex" itemKey="enabled-b" grow={1}>
          <Node position={[0, 0]} text="A2" fill="#dcfce7" stroke="#16a34a" />
        </LayoutItem>
      </InspectFlexLayout>
    </Scope>
    <LayoutInspectScope request={false} transforms={[{ kind: 'translate', x: 280, y: 34 }]}>
      <InspectFlexLayout size={{ x: { kind: 'fixed', value: 220 }, y: { kind: 'fixed', value: 110 } }} padding={12}>
        <LayoutItem kind="flex" itemKey="blocked-a" grow={1}>
          <Node position={[0, 0]} text="B1" fill="#dbeafe" stroke="#2563eb" />
        </LayoutItem>
        <LayoutItem kind="flex" itemKey="blocked-b" grow={1}>
          <Node position={[0, 0]} text="B2" fill="#dcfce7" stroke="#16a34a" />
        </LayoutItem>
      </InspectFlexLayout>
    </LayoutInspectScope>
  </>
);

/** 对比继承全图布局检查策略与 Scope 硬屏障 */
const Demo: FC = () => (
  <LayoutInspectLayout
    request={{ inspector: FLEX_LAYOUT_INSPECTOR_KEY, options: true }}
    width={520}
    height={190}
    viewBox={{ x: 0, y: 0, width: 520, height: 190 }}
  >
    <SceneContents />
  </LayoutInspectLayout>
);

/** 源码面板只派生持久化图形，运行时选择与屏障不写入 IR */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => (
    <Layout width={520} height={190} viewBox={{ x: 0, y: 0, width: 520, height: 190 }}>
      <SceneContents />
    </Layout>
  ),
} satisfies PreviewSourceConfig;

export default Demo;
