import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

/**
 * 阴影预设档位（sm → 2xl）
 * @description shadow 接 Tailwind 风格预设字符串，一字直用；档位越大投影越远越柔。
 */
const Demo: FC = () => (
  <Layout width={560} height={140}>
    <Node position={[-220, 0]} shape="rectangle" fill="white" padding={12} shadow="sm">
      sm
    </Node>
    <Node position={[-130, 0]} shape="rectangle" fill="white" padding={12} shadow="md">
      md
    </Node>
    <Node position={[-40, 0]} shape="rectangle" fill="white" padding={12} shadow="lg">
      lg
    </Node>
    <Node position={[50, 0]} shape="rectangle" fill="white" padding={12} shadow="xl">
      xl
    </Node>
    <Node position={[150, 0]} shape="rectangle" fill="white" padding={12} shadow="2xl">
      2xl
    </Node>
  </Layout>
);

export default Demo;
