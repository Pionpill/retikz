import { FlexLayout, FlexLayoutItem } from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/** Compares visible and clipped output when fixed geometry refuses a smaller slot */
const Demo: FC = () => (
  <Layout>
    <FlexLayout direction="column" gap={18}>
      <FlexLayoutItem itemKey="visible-row">
        <FlexLayout
          size={{ x: { kind: 'fixed', value: 170 }, y: { kind: 'fixed', value: 52 } }}
          padding={8}
          overflow="visible"
        >
          <FlexLayoutItem itemKey="visible" basis={72} min={72} max={72}>
            <Node
              text="Visible: fixed geometry"
              style={{ fill: '#dbeafe', stroke: '#2563eb' }}
              layout={{ minimumSize: { width: 220, height: 32 } }}
            />
          </FlexLayoutItem>
        </FlexLayout>
      </FlexLayoutItem>
      <FlexLayoutItem itemKey="clip-row">
        <FlexLayout
          size={{ x: { kind: 'fixed', value: 170 }, y: { kind: 'fixed', value: 52 } }}
          padding={8}
          overflow="clip"
        >
          <FlexLayoutItem itemKey="clip" basis={72} min={72} max={72}>
            <Node
              text="Clipped: fixed geometry"
              style={{ fill: '#fee2e2', stroke: '#dc2626' }}
              layout={{ minimumSize: { width: 220, height: 32 } }}
            />
          </FlexLayoutItem>
        </FlexLayout>
      </FlexLayoutItem>
    </FlexLayout>
  </Layout>
);

export default Demo;
