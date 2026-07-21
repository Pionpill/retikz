import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** 内置与自定义 Definition 共用协议、registry 与 compile consumer */
const Demo: FC = () => (
  <Layout width={760} height={210} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="definition-contract"
      text=" "
      position={[-250, 5]}
      minimumSize={{ width: 200, height: 130 }}
      stroke="lightgray"
      fill="lightgray"
      fillOpacity={0.04}
      dashPattern={[4, 3]}
      cornerRadius={4}
    />
    <Node
      text="XxxDefinition contract"
      position={[-270, -48]}
      stroke="none"
      fill="none"
      padding={0}
      textColor="gray"
      font={{ size: 12 }}
    />

    <Node
      id="builtins"
      text="BUILTIN_*"
      position={[-250, -18]}
      minimumSize={{ width: 150, height: 34 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="custom"
      text="defineXxx(custom)"
      position={[-250, 28]}
      minimumSize={{ width: 150, height: 34 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="resolver"
      text="resolveXxxRegistry"
      position={[-45, 5]}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="registry"
      text={[
        { text: 'effective registry', font: { size: 14, weight: 'bold' } },
        { text: 'ReadonlyMap', fill: 'gray', font: { size: 12 } },
      ]}
      position={[150, 5]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="consumer"
      text="compile consumer"
      position={[320, 5]}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />

    <Draw way={['builtins', 'resolver']} arrow="->" />
    <Draw way={['custom', 'resolver']} arrow="->" />
    <Draw way={['resolver', 'registry']} arrow="->" />
    <Draw way={['registry', 'consumer']} arrow="->" />
  </Layout>
);

export default Demo;
