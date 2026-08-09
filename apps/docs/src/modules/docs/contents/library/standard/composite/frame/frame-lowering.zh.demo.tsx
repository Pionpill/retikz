import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Frame 从 Standard JSON IR 下沉到 Core IR 的中文逻辑图 */
const Demo: FC = () => (
  <Layout width={760} height={100} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="frame-ir"
      position={[-285, 0]}
      text={[
        { text: 'Standard JSON IR', font: { size: 14, weight: 'bold' } },
        { text: 'Frame 字段', fill: 'gray', font: { size: 12 } },
      ]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
    />
    <Node
      id="definition"
      position={[-95, 0]}
      text={[
        { text: 'FrameDefinition', font: { size: 14, weight: 'bold' } },
        { text: '校验 · 匹配', fill: 'gray', font: { size: 12 } },
      ]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
    />
    <Node
      id="lowering"
      position={[95, 0]}
      text={[
        { text: 'lowering', font: { size: 14, weight: 'bold' } },
        { text: '标题排布 · 边界 · 内边距', fill: 'gray', font: { size: 12 } },
      ]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
    />
    <Node
      id="core-ir"
      position={[285, 0]}
      text={[
        { text: 'Core IR[]', font: { size: 14, weight: 'bold' } },
        { text: 'Scope · Path · Node', fill: 'gray', font: { size: 12 } },
      ]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
    />

    <Draw way={['frame-ir', 'definition']} arrow="->" stroke="gray" />
    <Draw way={['definition', 'lowering']} arrow="->" stroke="gray" />
    <Draw way={['lowering', 'core-ir']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
