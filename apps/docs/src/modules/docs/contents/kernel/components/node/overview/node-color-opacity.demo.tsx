import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

/**
 * 颜色 / 不透明度族对照
 * @description textColor 块级文字色、opacity 整节点透明、fillOpacity 仅填充、strokeOpacity 仅描边。
 */
const Demo: FC = () => (
  <Layout width={520} height={120}>
    <Node id="tc" position={[-180, 0]} fill="lightgray" textColor="red">
      textColor
    </Node>
    <Node id="op" position={[-50, 0]} fill="dodgerblue" opacity={0.4} textColor="white">
      opacity 0.4
    </Node>
    <Node id="fo" position={[80, 0]} fill="dodgerblue" fillOpacity={0.3}>
      fillOpacity
    </Node>
    <Node id="do" position={[210, 0]} stroke="red" strokeWidth={3} strokeOpacity={0.3}>
      strokeOpacity
    </Node>
  </Layout>
);

export default Demo;
