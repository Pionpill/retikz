import type { FC } from 'react';

import { Layout, Node, Scope } from '@retikz/react';
import { FLEX_LAYOUT_INSPECTOR_KEY } from '@retikz/standard/inspect';
import { LayoutItem } from '@retikz/standard-react';
import { InspectFlexLayout, StandardInspectLayout, StandardInspectScope } from '@retikz/standard-react/inspect';

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
    <StandardInspectScope request={false} transforms={[{ kind: 'translate', x: 280, y: 34 }]}>
      <InspectFlexLayout size={{ x: { kind: 'fixed', value: 220 }, y: { kind: 'fixed', value: 110 } }} padding={12}>
        <LayoutItem kind="flex" itemKey="blocked-a" grow={1}>
          <Node position={[0, 0]} text="B1" fill="#dbeafe" stroke="#2563eb" />
        </LayoutItem>
        <LayoutItem kind="flex" itemKey="blocked-b" grow={1}>
          <Node position={[0, 0]} text="B2" fill="#dcfce7" stroke="#16a34a" />
        </LayoutItem>
      </InspectFlexLayout>
    </StandardInspectScope>
  </>
);

/** Compare inherited whole-figure layout inspection with a Scope barrier */
const Demo: FC = () => (
  <StandardInspectLayout
    request={{ inspector: FLEX_LAYOUT_INSPECTOR_KEY, value: true }}
    width={520}
    height={190}
    viewBox={{ x: 0, y: 0, width: 520, height: 190 }}
  >
    <SceneContents />
  </StandardInspectLayout>
);

/** Source panels derive only persistent IR; runtime selection and barriers stay outside it */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => (
    <Layout width={520} height={190} viewBox={{ x: 0, y: 0, width: 520, height: 190 }}>
      <SceneContents />
    </Layout>
  ),
} satisfies PreviewSourceConfig;

export default Demo;
