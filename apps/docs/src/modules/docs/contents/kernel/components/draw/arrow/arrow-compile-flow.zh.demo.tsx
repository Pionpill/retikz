import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** 箭头端点解析、定义物化与路径收缩流程图 */
const Demo: FC = () => (
  <Layout width={660} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="props"
      position={[-250, 0]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      arrow + arrowDetail
    </Node>
    <Node
      id="style"
      position={[-25, -75]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      Scope 默认 / path 主色
    </Node>
    <Node
      id="resolver"
      position={[-25, 0]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      端点箭头解析
    </Node>
    <Node
      id="registry"
      position={[-25, 75]}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      Arrow registry
    </Node>
    <Node
      id="marker"
      position={[230, -52]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      arrowStart / arrowEnd
    </Node>
    <Node
      id="path"
      position={[230, 52]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      收缩后的 path commands
    </Node>

    <Draw way={['props', 'resolver']} arrow="->" stroke="gray" />
    <Draw way={['style', 'resolver']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['registry', 'resolver']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['resolver', 'marker']} arrow="->" stroke="gray" />
    <Draw way={['resolver', 'path']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
