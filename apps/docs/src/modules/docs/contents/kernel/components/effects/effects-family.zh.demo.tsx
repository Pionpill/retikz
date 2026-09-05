import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** 效果家族从图元输入到 Scene 的职责关系图 */
const Demo: FC = () => (
  <Layout width={700} height={270} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="inputs"
      position={[-250, -40]}
      text={['Node / Path', '效果属性 + 图案填充']}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 13 } }}
    />
    <Node
      id="compile"
      position={[-85, -40]}
      text={['Compile', '解析图案']}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'lightgray', fillOpacity: 0.16, font: { size: 13 } }}
    />
    <Node
      id="scene"
      position={[85, -40]}
      text={['Scene', '图元 · 资源 · 轨道']}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13, weight: 'bold' } }}
    />
    <Node
      id="renderer"
      position={[250, -40]}
      text={['Renderer', 'SVG / Canvas']}
      cornerRadius={4}
      style={{ stroke: 'darkviolet', fill: 'darkviolet', fillOpacity: 0.08, font: { size: 13 } }}
    />
    <Node
      id="patterns"
      position={[-85, 80]}
      text={['图案注册表', 'PatternDefinition']}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'lightgray', fillOpacity: 0.12, font: { size: 13 } }}
    />
    <Node
      id="animation-registries"
      position={[250, 80]}
      text={['动画注册表', '缓动 · 属性通道']}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'lightgray', fillOpacity: 0.12, font: { size: 13 } }}
    />

    <Draw way={['inputs', 'compile']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['compile', 'scene']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['scene', 'renderer']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['patterns', 'compile']} arrow="->" style={{ stroke: 'gray', dashPattern: [4, 3] }} />
    <Draw way={['animation-registries', 'renderer']} arrow="->" style={{ stroke: 'gray', dashPattern: [4, 3] }} />
  </Layout>
);

export default Demo;
