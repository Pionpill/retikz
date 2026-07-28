import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFrame, LogicFrameTitle } from '@/modules/docs/components/logic-figure';

/** Table adapters、规格、下沉与渲染出口的从左到右架构图 */
const Demo: FC = () => (
  <Layout width={660} height={140} style={{ maxWidth: '100%', height: 'auto' }}>
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

    <LogicFrame id="table-group">
      <LogicFrameTitle>@retikz/table</LogicFrameTitle>
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
        layout transaction
      </Node>
    </LogicFrame>

    <Node
      id="core"
      position={[78, 8]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13, weight: 'bold' }}
    >
      Core compile
    </Node>
    <Node
      id="compile-render"
      position={[185, 8]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      Scene + artifact
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
