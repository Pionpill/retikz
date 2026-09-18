import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/** 按内容自动计算输出边界 */
const Demo: FC = () => (
  <Layout style={{ outline: '1px dashed gray', outlineOffset: '-1px' }}>
    <Node
      id="o"
      position={[0, 0]}
      shape="circle"
      style={{ fill: 'dodgerblue', textColor: 'white' }}
      layout={{ minimumSize: 44 }}
    >
      0,0
    </Node>
    <Node id="c" position={[70, 70]} shape="circle" style={{ fill: 'darkorange' }} layout={{ minimumSize: 24 }} />
  </Layout>
);

export default Demo;
