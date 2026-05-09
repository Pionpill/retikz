import { Node, Text, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * 两条等价路径——左边 <Text> Sugar、右边 text prop 数组里写 LineSpec 对象，
 * 编译产物完全相同。
 */
const Demo: FC = () => (
  <Tikz width={420} height={140}>
    <Node id="sugar" position={[-100, 0]} align="left">
      <Text fill="#dc2626" font={{ weight: 'bold', size: 16 }}>Heading</Text>
      body line 1
      <Text font={{ style: 'italic' }} opacity={0.6}>note</Text>
    </Node>

    <Node id="prop" position={[100, 0]} align="left" text={[
      { text: 'Heading', fill: '#dc2626', font: { weight: 'bold', size: 16 } },
      'body line 1',
      { text: 'note', font: { style: 'italic' }, opacity: 0.6 },
    ]} />
  </Tikz>
);

export default Demo;
