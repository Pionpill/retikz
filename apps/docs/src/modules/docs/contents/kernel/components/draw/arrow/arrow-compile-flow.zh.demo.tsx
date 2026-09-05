import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** 箭头端点解析、定义物化与路径收缩流程图 */
const Demo: FC = () => (
  <Layout width={660} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="props"
      position={[-250, 0]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.1, font: { size: 14 } }}
    >
      arrow + arrowDetail
    </Node>
    <Node
      id="style"
      position={[-25, -75]}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'lightgray', fillOpacity: 0.16, font: { size: 14 } }}
    >
      Scope 默认 / path 主色
    </Node>
    <Node
      id="resolver"
      position={[-25, 0]}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'lightgray', fillOpacity: 0.16, font: { size: 14, weight: 'bold' } }}
    >
      端点箭头解析
    </Node>
    <Node
      id="registry"
      position={[-25, 75]}
      cornerRadius={4}
      style={{ stroke: 'darkviolet', fill: 'darkviolet', fillOpacity: 0.08, font: { size: 14 } }}
    >
      Arrow registry
    </Node>
    <Node
      id="marker"
      position={[230, -52]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 14 } }}
    >
      arrowStart / arrowEnd
    </Node>
    <Node
      id="path"
      position={[230, 52]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 14 } }}
    >
      收缩后的 path commands
    </Node>

    <Draw way={['props', 'resolver']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['style', 'resolver']} arrow="->" style={{ stroke: 'gray', dashPattern: [4, 3] }} />
    <Draw way={['registry', 'resolver']} arrow="->" style={{ stroke: 'gray', dashPattern: [4, 3] }} />
    <Draw way={['resolver', 'marker']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['resolver', 'path']} arrow="->" style={{ stroke: 'gray' }} />
  </Layout>
);

export default Demo;
