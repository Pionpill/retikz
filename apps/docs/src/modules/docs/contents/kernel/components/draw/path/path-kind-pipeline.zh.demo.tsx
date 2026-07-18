import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Path kind provider 从组件输入分派到 Scene 输出的逻辑图 */
const Demo: FC = () => (
  <Layout width={760} height={270} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="path-input"
      position={[-300, 0]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      Path + Step
    </Node>
    <Node
      id="kind-registry"
      position={[-135, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      kind 注册表
    </Node>
    <Node
      id="stroke-provider"
      position={[65, -78]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      stroke：命令 + 装饰
    </Node>
    <Node
      id="ribbon-provider"
      position={[65, 0]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      ribbon：宽度 → 轮廓
    </Node>
    <Node
      id="custom-provider"
      position={[65, 78]}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      自定义：接管输出
    </Node>
    <Node
      id="scene-output"
      position={[300, 0]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      Scene primitives
    </Node>

    <Draw
      way={[
        'path-input',
        { label: { text: 'kind', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'kind-registry',
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw way={['kind-registry', 'stroke-provider']} arrow="->" stroke="gray" />
    <Draw way={['kind-registry', 'ribbon-provider']} arrow="->" stroke="gray" />
    <Draw way={['kind-registry', 'custom-provider']} arrow="->" stroke="gray" />
    <Draw way={['stroke-provider', 'scene-output']} arrow="->" stroke="gray" />
    <Draw way={['ribbon-provider', 'scene-output']} arrow="->" stroke="gray" />
    <Draw way={['custom-provider', 'scene-output']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
