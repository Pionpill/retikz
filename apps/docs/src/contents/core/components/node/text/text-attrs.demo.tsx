import { Layout, Node, Text } from '@retikz/react';
import type { FC } from 'react';

/**
 * <Text> 行级覆盖字段并排
 * @description fill 颜色、opacity 单行透明度、font 部分覆盖（family / size / weight / style）。
 */
const Demo: FC = () => (
  <Layout width={520} height={130}>
    <Node id="fill" position={[-180, 0]} align="left">
      <Text fill="red">red line</Text>
      <Text fill="green">green line</Text>
      <Text fill="blue">blue line</Text>
    </Node>

    <Node id="op" position={[-30, 0]} align="left">
      normal
      <Text opacity={0.6}>fade 0.6</Text>
      <Text opacity={0.3}>fade 0.3</Text>
    </Node>

    <Node id="font" position={[140, 0]} align="left">
      <Text font={{ weight: 'bold', size: 16 }}>Bold large</Text>
      <Text font={{ style: 'italic' }}>Italic</Text>
      <Text font={{ family: 'monospace' }}>mono()</Text>
    </Node>
  </Layout>
);

export default Demo;
