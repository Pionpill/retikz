import type { FC } from 'react';

import { FlexLayout, LayoutItem } from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';

/** Compares visible and clipped output when fixed geometry refuses a smaller slot */
const Demo: FC = () => (
  <Layout width={460} height={170}>
    <FlexLayout direction="column" gap={18}>
      <LayoutItem kind="flex" itemKey="visible-row">
        <FlexLayout
          size={{ x: { kind: 'fixed', value: 170 }, y: { kind: 'fixed', value: 52 } }}
          padding={8}
          overflow="visible"
        >
          <LayoutItem kind="flex" itemKey="visible" basis={72} min={72} max={72}>
            <Node
              position={[0, 0]}
              text="Visible: fixed geometry"
              minimumSize={{ width: 220, height: 32 }}
              fill="#dbeafe"
              stroke="#2563eb"
            />
          </LayoutItem>
        </FlexLayout>
      </LayoutItem>
      <LayoutItem kind="flex" itemKey="clip-row">
        <FlexLayout
          size={{ x: { kind: 'fixed', value: 170 }, y: { kind: 'fixed', value: 52 } }}
          padding={8}
          overflow="clip"
        >
          <LayoutItem kind="flex" itemKey="clip" basis={72} min={72} max={72}>
            <Node
              position={[0, 0]}
              text="Clipped: fixed geometry"
              minimumSize={{ width: 220, height: 32 }}
              fill="#fee2e2"
              stroke="#dc2626"
            />
          </LayoutItem>
        </FlexLayout>
      </LayoutItem>
    </FlexLayout>
  </Layout>
);

export default Demo;
