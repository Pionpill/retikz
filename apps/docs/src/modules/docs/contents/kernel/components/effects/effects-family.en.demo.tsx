import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Effects family responsibilities from primitive input to Scene output */
const Demo: FC = () => (
  <Layout width={700} height={270} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="inputs"
      position={[-250, -40]}
      text={['Node / Path', 'effect props + pattern fill']}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="compile"
      position={[-85, -40]}
      text={['Compile', 'resolve patterns']}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="scene"
      position={[85, -40]}
      text={['Scene', 'primitives · resources · tracks']}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13, weight: 'bold' }}
    />
    <Node
      id="renderer"
      position={[250, -40]}
      text={['Renderer', 'SVG / Canvas']}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="patterns"
      position={[-85, 80]}
      text={['Pattern registry', 'PatternDefinition']}
      stroke="gray"
      fill="lightgray"
      fillOpacity={0.12}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="animation-registries"
      position={[250, 80]}
      text={['Animation registries', 'easing · properties']}
      stroke="gray"
      fill="lightgray"
      fillOpacity={0.12}
      cornerRadius={4}
      font={{ size: 13 }}
    />

    <Draw way={['inputs', 'compile']} arrow="->" stroke="gray" />
    <Draw way={['compile', 'scene']} arrow="->" stroke="gray" />
    <Draw way={['scene', 'renderer']} arrow="->" stroke="gray" />
    <Draw way={['patterns', 'compile']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['animation-registries', 'renderer']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
