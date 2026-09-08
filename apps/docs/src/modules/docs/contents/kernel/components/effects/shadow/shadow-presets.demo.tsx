import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

/**
 * 阴影预设档位（sm → 2xl）
 * @description shadow 接 Tailwind 风格预设字符串，一字直用；档位越大投影越远越柔。
 */
const Demo: FC = () => (
  <Layout>
    <Node position={[-220, 0]} shape="rectangle" style={{ fill: 'white', shadow: 'sm' }} layout={{ padding: 12 }}>
      sm
    </Node>
    <Node position={[-130, 0]} shape="rectangle" style={{ fill: 'white', shadow: 'md' }} layout={{ padding: 12 }}>
      md
    </Node>
    <Node position={[-40, 0]} shape="rectangle" style={{ fill: 'white', shadow: 'lg' }} layout={{ padding: 12 }}>
      lg
    </Node>
    <Node position={[50, 0]} shape="rectangle" style={{ fill: 'white', shadow: 'xl' }} layout={{ padding: 12 }}>
      xl
    </Node>
    <Node position={[150, 0]} shape="rectangle" style={{ fill: 'white', shadow: '2xl' }} layout={{ padding: 12 }}>
      2xl
    </Node>
  </Layout>
);

export default Demo;
