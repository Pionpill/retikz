import type { FC } from 'react';

import { Layout, Node, Scope } from '@retikz/react';
import { FlexLayout, LayoutItem } from '@retikz/standard-react';

/** Compare inherited whole-figure layout inspection with a Scope barrier */
const Demo: FC = () => (
  <Layout width={520} height={190} viewBox={{ x: 0, y: 0, width: 520, height: 190 }} inspect={{ layout: true }}>
    <Scope transforms={[{ kind: 'translate', x: 20, y: 34 }]}>
      <FlexLayout size={{ x: { kind: 'fixed', value: 220 }, y: { kind: 'fixed', value: 110 } }} padding={12}>
        <LayoutItem kind="flex" itemKey="enabled-a" grow={1}>
          <Node position={[0, 0]} text="A1" fill="#dbeafe" stroke="#2563eb" />
        </LayoutItem>
        <LayoutItem kind="flex" itemKey="enabled-b" grow={1}>
          <Node position={[0, 0]} text="A2" fill="#dcfce7" stroke="#16a34a" />
        </LayoutItem>
      </FlexLayout>
    </Scope>
    <Scope inspect={{ enabled: false }} transforms={[{ kind: 'translate', x: 280, y: 34 }]}>
      <FlexLayout size={{ x: { kind: 'fixed', value: 220 }, y: { kind: 'fixed', value: 110 } }} padding={12}>
        <LayoutItem kind="flex" itemKey="blocked-a" grow={1}>
          <Node position={[0, 0]} text="B1" fill="#dbeafe" stroke="#2563eb" />
        </LayoutItem>
        <LayoutItem kind="flex" itemKey="blocked-b" grow={1}>
          <Node position={[0, 0]} text="B2" fill="#dcfce7" stroke="#16a34a" />
        </LayoutItem>
      </FlexLayout>
    </Scope>
  </Layout>
);

export default Demo;
