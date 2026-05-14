import { Node, Text, TikZ } from '@retikz/react';
import type { FC } from 'react';

/** 最小 <Text> 用法：在 <Node> 里写一行带样式的行。 */
const Demo: FC = () => (
  <TikZ width={300} height={80}>
    <Node id="a" position={[0, 0]} align="left">
      <Text fill="#dc2626" font={{ weight: 'bold' }}>Heading</Text>
      body line 1
      body line 2
    </Node>
  </TikZ>
);

export default Demo;
