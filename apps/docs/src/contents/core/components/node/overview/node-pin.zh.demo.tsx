import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * pin 引脚：带引线的标签
 * @description 节点边界画引线连到标签；右侧实线 pin、左上虚线 pin（leader.dashPattern）。
 */
const Demo: FC = () => (
  <Layout width={440} height={240}>
    <Node
      id="q0"
      position={[0, 10]}
      shape="circle"
      fill="#eef2ff"
      stroke="#8893d8"
      minimumSize={40}
      label={[
        { text: '入口态', position: 'right', distance: 34, pin: true },
        {
          text: '初始',
          position: 'above-left',
          distance: 34,
          pin: { stroke: '#999999', dashPattern: [3, 2] },
        },
      ]}
    >
      q0
    </Node>
  </Layout>
);

export default Demo;
