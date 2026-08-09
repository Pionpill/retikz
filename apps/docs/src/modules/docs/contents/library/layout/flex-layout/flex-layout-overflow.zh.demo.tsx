import type { FC } from 'react';

import { FlexLayout, LayoutItem } from '@retikz/layout-react';
import { Layout, Node } from '@retikz/react';

/** 对比 fixed child 拒绝较小 slot 时 visible 与 clip 的表现 */
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
              text="可见溢出：固定宽度"
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
              text="裁切溢出：固定宽度"
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
