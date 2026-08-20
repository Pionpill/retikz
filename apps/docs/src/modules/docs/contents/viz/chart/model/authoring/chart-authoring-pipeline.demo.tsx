import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** React、Vanilla 与 JSON Chart 输入汇入统一绑定和解析主链 */
const Demo: FC = () => (
  <Layout width={800} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="authoring"
      position={[-315, 20]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
    >
      React / Vanilla
    </Node>
    <Node id="source" position={[-155, 20]} stroke="darkorange" fill="darkorange" fillOpacity={0.08} cornerRadius={4}>
      Exact Source IR
    </Node>
    <Node id="json" position={[-155, -65]} stroke="gray" fill="lightgray" fillOpacity={0.16} cornerRadius={4}>
      JSON + exact schema
    </Node>
    <Node id="bind" position={[0, 20]} stroke="gray" fill="lightgray" fillOpacity={0.16} cornerRadius={4}>
      recipe.bind
    </Node>
    <Node id="resolve" position={[155, 20]} stroke="gray" fill="lightgray" fillOpacity={0.16} cornerRadius={4}>
      resolveChart
    </Node>
    <Node id="base" position={[315, 20]} stroke="seagreen" fill="seagreen" fillOpacity={0.08} cornerRadius={4}>
      IRBaseChart
    </Node>

    <Draw way={['authoring', 'source']} arrow="->" />
    <Draw way={['json', 'source']} arrow="->" />
    <Draw way={['source', 'bind']} arrow="->" />
    <Draw way={['bind', 'resolve']} arrow="->" />
    <Draw way={['resolve', 'base']} arrow="->" />
  </Layout>
);

export default Demo;
