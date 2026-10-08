import { FlexLayoutItem } from '@retikz/layout-react';
import { InspectFlexLayout, LayoutInspectLayout, LayoutInspectScope } from '@retikz/layout-react/inspect';
import { FLEX_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';
import { Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

import type { PreviewSourceConfig } from '@/modules/docs/preview';

const SceneContents: FC = () => (
  <>
    <Scope position={[20, 34]}>
      <InspectFlexLayout size={{ x: { kind: 'fixed', value: 220 }, y: { kind: 'fixed', value: 110 } }} padding={12}>
        <FlexLayoutItem itemKey="enabled-a" grow={1}>
          <Node position={[0, 0]} text="A1" style={{ fill: '#dbeafe', stroke: '#2563eb' }} />
        </FlexLayoutItem>
        <FlexLayoutItem itemKey="enabled-b" grow={1}>
          <Node position={[0, 0]} text="A2" style={{ fill: '#dcfce7', stroke: '#16a34a' }} />
        </FlexLayoutItem>
      </InspectFlexLayout>
    </Scope>
    <LayoutInspectScope request={false} position={[280, 34]}>
      <InspectFlexLayout size={{ x: { kind: 'fixed', value: 220 }, y: { kind: 'fixed', value: 110 } }} padding={12}>
        <FlexLayoutItem itemKey="blocked-a" grow={1}>
          <Node position={[0, 0]} text="B1" style={{ fill: '#dbeafe', stroke: '#2563eb' }} />
        </FlexLayoutItem>
        <FlexLayoutItem itemKey="blocked-b" grow={1}>
          <Node position={[0, 0]} text="B2" style={{ fill: '#dcfce7', stroke: '#16a34a' }} />
        </FlexLayoutItem>
      </InspectFlexLayout>
    </LayoutInspectScope>
  </>
);

/** Compare inherited whole-figure layout inspection with a Scope barrier */
const Demo: FC = () => (
  <LayoutInspectLayout request={{ inspector: FLEX_LAYOUT_INSPECTOR_KEY, options: true }}>
    <SceneContents />
  </LayoutInspectLayout>
);

/** Source panels derive only persistent IR; runtime selection and barriers stay outside it */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => (
    <Layout>
      <SceneContents />
    </Layout>
  ),
} satisfies PreviewSourceConfig;

export default Demo;
