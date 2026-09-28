import { FlexLayout, FlexLayoutItem } from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/** 对比 fixed child 拒绝较小 slot 时 visible 与 clip 的表现 */
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
              position={[0, 0]}
              text="可见溢出：固定宽度"
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
              position={[0, 0]}
              text="裁切溢出：固定宽度"
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
