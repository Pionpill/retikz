import { Layout, Node, Text } from '@retikz/react';
import type { FC } from 'react';

/**
 * 行级样式覆盖
 * @description 左：<Text> 写 heading + 普通 body；中：text prop 数组混 LineSpec 对象 + 字符串；右：每行单独 fill / opacity 行级独立染色。
 */
const Demo: FC = () => (
  <Layout width={520} height={160}>
    <Node id="left" position={[-180, 0]} align="left">
      <Text fill="#dc2626" font={{ weight: 'bold', size: 16 }}>Heading</Text>
      body line 1
      body line 2
    </Node>

    <Node
      id="mid"
      position={[0, 0]}
      align="left"
      text={[
        { text: 'Title', font: { weight: 'bold', size: 16 }, fill: '#2563eb' },
        'body 1',
        { text: 'note', font: { style: 'italic' }, opacity: 0.6 },
      ]}
    />

    <Node id="right" position={[180, 0]} align="left">
      <Text fill="#16a34a">success</Text>
      <Text fill="#f59e0b">warning</Text>
      <Text fill="#dc2626" opacity={0.8}>error</Text>
    </Node>
  </Layout>
);

export default Demo;
