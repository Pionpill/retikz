import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** 自定义形状从 JSON 引用与运行时定义汇合到 Scene 和连接几何的流程（英文标签） */
const Demo: FC = () => (
  <Layout width={560} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="ref" position={[-190, -60]} stroke="darkorange" fill="darkorange" fillOpacity={0.08} cornerRadius={4}>
      Shape ref (JSON)
    </Node>
    <Node
      id="definition"
      position={[-190, 60]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
    >
      ShapeDefinition
    </Node>
    <Node
      id="compile"
      position={[0, 0]}
      stroke="gray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ weight: 'bold' }}
    >
      Registry + compile
    </Node>
    <Node id="scene" position={[190, -60]} stroke="darkorange" fill="darkorange" fillOpacity={0.08} cornerRadius={4}>
      Scene primitives
    </Node>
    <Node id="geometry" position={[190, 60]} stroke="dodgerblue" fill="dodgerblue" fillOpacity={0.08} cornerRadius={4}>
      Boundary + anchors
    </Node>

    <Draw way={['ref', 'compile']} arrow="->" />
    <Draw way={['definition', 'compile']} arrow="->" dashPattern={[5, 4]} stroke="gray" />
    <Draw way={['compile', 'scene']} arrow="->" />
    <Draw way={['compile', 'geometry']} arrow="->" />
  </Layout>
);

export default Demo;
