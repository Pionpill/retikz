import { Layout, Node, Text } from '@retikz/react';
import type { FC } from 'react';

/**
 * <Text> 与字符串 children 平等参与
 * @description 按 JSX 顺序排成多行：字符串子项按 '\n' 拆纯样式行，<Text> 一个就是一行带覆盖样式。
 */
const Demo: FC = () => (
  <Layout width={320} height={140}>
    <Node id="mix" position={[0, 0]} align="left">
      {'before\nplain1'}
      <Text fill="#dc2626" font={{ weight: 'bold' }}>RED + BOLD</Text>
      <Text font={{ style: 'italic' }}>italic note</Text>
      {'plain2\nafter'}
    </Node>
  </Layout>
);

export default Demo;
