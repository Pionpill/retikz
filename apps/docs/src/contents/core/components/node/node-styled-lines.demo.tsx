import { Node, Text, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * 行级样式覆盖：
 * - 左：用 <Text> 写 heading（粗体 + 红）+ 普通 body 行
 * - 中：text prop 数组里混 LineSpec 对象 + 字符串
 * - 右：每行单独 fill / opacity，体现行级独立染色
 */
const Demo: FC = () => (
  <Tikz width={520} height={160}>
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
  </Tikz>
);

export default Demo;
