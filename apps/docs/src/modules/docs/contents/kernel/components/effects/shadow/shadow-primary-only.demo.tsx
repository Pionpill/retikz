import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

/**
 * 阴影只跟随主几何
 * @description shadow 落在节点 shape 上，不落在 text / label 上——文字与标签不带投影。
 */
const Demo: FC = () => (
  <Layout>
    <Node
      position={[0, 0]}
      shape="rectangle"
      label={{ text: 'label', position: 'top' }}
      style={{ fill: 'white', shadow: 'lg' }}
      layout={{ padding: 16 }}
    >
      text
    </Node>
  </Layout>
);

export default Demo;
