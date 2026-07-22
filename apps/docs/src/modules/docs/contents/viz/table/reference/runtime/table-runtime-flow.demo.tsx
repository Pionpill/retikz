import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Table adapters、规格、下沉与渲染出口的从左到右架构图 */
const Demo: FC = () => (
  <Layout width={660} height={140} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      position={[-108, 8]}
      minimumSize={{ width: 224, height: 74 }}
      stroke="lightgray"
      fill="lightgray"
      fillOpacity={0.04}
      dashPattern={[4, 3]}
      cornerRadius={4}
    >
      {' '}
    </Node>
    <Node position={[-175, -19]} stroke="none" fill="none" padding={0} textColor="gray" font={{ size: 12 }}>
      @retikz/table
    </Node>

    <Node
      id="entries"
      position={[-280, 8]}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      {'React · Vanilla\nexternal'}
    </Node>

    <Node
      id="spec"
      position={[-165, 8]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13, weight: 'bold' }}
    >
      TableSpec
    </Node>
    <Node
      id="runtime"
      position={[-52, 8]}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      resolve + lower
    </Node>

    <Node
      id="core"
      position={[53, 8]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13, weight: 'bold' }}
    >
      Core IR
    </Node>
    <Node
      id="compile-render"
      position={[160, 8]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      compile + render
    </Node>
    <Node
      id="outputs"
      position={[285, 8]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      SVG · Canvas
    </Node>

    <Draw way={['entries', 'spec']} arrow="->" />
    <Draw way={['spec', 'runtime']} arrow="->" />
    <Draw way={['runtime', 'core']} arrow="->" />
    <Draw way={['core', 'compile-render']} arrow="->" />
    <Draw way={['compile-render', 'outputs']} arrow="->" />
  </Layout>
);

export default Demo;
