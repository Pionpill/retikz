import { Layout, Node, loop, slideIn } from '@retikz/react';
import type { FC } from 'react';

// loop 包装任意 track：把一次性 slideIn 变成往返无限循环（direction: 'alternate'）
const Demo: FC = () => (
  <Layout width={220} height={100}>
    <Node id="a" position={[0, 0]} fill="#0ea5e9" animations={[loop(slideIn({ axis: 'x', offset: -40 }), { direction: 'alternate' })]}>
      loop
    </Node>
  </Layout>
);

export default Demo;
