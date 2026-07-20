import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** 从宿主适配到渲染后端的运行时主链，并标明 Parser 只是 IR 输入旁路 */
const Demo: FC = () => (
  <Layout width={760} height={170} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="host-group"
      text=" "
      position={[-290, -28]}
      minimumSize={{ width: 160, height: 88 }}
      stroke="lightgray"
      fill="lightgray"
      fillOpacity={0.04}
      dashPattern={[4, 3]}
      cornerRadius={4}
    />
    <Node
      text="Host adapters"
      position={[-325, -60]}
      stroke="none"
      fill="none"
      padding={0}
      textColor="gray"
      font={{ size: 12 }}
    />
    <Node
      id="adapters"
      text={[
        { text: 'React / Vanilla', font: { weight: 'bold' } },
        { text: 'authoring adapters', fill: 'gray', font: { size: 11 } },
      ]}
      position={[-290, -23]}
      minimumSize={{ width: 132, height: 46 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />

    <Node
      id="core-group"
      text=" "
      position={[0, -3]}
      minimumSize={{ width: 390, height: 138 }}
      stroke="lightgray"
      fill="lightgray"
      fillOpacity={0.04}
      dashPattern={[4, 3]}
      cornerRadius={4}
    />
    <Node
      text="@retikz/core"
      position={[-152, -60]}
      stroke="none"
      fill="none"
      padding={0}
      textColor="gray"
      font={{ size: 12 }}
    />
    <Node
      id="ir"
      text={[
        { text: 'Core IR', font: { weight: 'bold' } },
        { text: 'serializable input', fill: 'gray', font: { size: 11 } },
      ]}
      position={[-125, -23]}
      minimumSize={{ width: 104, height: 46 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />
    <Node
      id="compile"
      text={[
        { text: 'compileToScene', font: { weight: 'bold' } },
        { text: 'layout · resolve', fill: 'gray', font: { size: 11 } },
      ]}
      position={[0, -23]}
      minimumSize={{ width: 120, height: 46 }}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.06}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />
    <Node
      id="scene"
      text={[
        { text: 'Scene', font: { weight: 'bold' } },
        { text: 'resolved primitives', fill: 'gray', font: { size: 11 } },
      ]}
      position={[125, -23]}
      minimumSize={{ width: 104, height: 46 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />
    <Node
      id="parser"
      text={[
        { text: 'Parser helpers', font: { weight: 'bold' } },
        { text: 'sugar → IR fragment', fill: 'gray', font: { size: 11 } },
      ]}
      position={[-125, 36]}
      minimumSize={{ width: 132, height: 44 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />

    <Node
      id="render-group"
      text=" "
      position={[290, -28]}
      minimumSize={{ width: 160, height: 88 }}
      stroke="lightgray"
      fill="lightgray"
      fillOpacity={0.04}
      dashPattern={[4, 3]}
      cornerRadius={4}
    />
    <Node
      text="Render"
      position={[245, -60]}
      stroke="none"
      fill="none"
      padding={0}
      textColor="gray"
      font={{ size: 12 }}
    />
    <Node
      id="render"
      text={[
        { text: '@retikz/render', font: { weight: 'bold' } },
        { text: 'SVG · Canvas', fill: 'gray', font: { size: 11 } },
      ]}
      position={[290, -23]}
      minimumSize={{ width: 132, height: 46 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />

    <Draw way={['adapters', 'ir']} arrow="->" stroke="gray" />
    <Draw way={['ir', 'compile']} arrow="->" stroke="gray" />
    <Draw way={['compile', 'scene']} arrow="->" stroke="gray" />
    <Draw way={['scene', 'render']} arrow="->" stroke="gray" />
    <Draw way={['parser', 'ir']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
