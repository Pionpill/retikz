import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Draw 家族从便捷写法到 Kernel 路径的职责关系图 */
const Demo: FC = () => (
  <Layout width={620} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="way" position={[-250, -40]} stroke="darkorange" fill="darkorange" fillOpacity={0.08} cornerRadius={4}>
      Way
    </Node>
    <Node
      id="draw"
      position={[-95, -40]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ weight: 'bold' }}
    >
      Draw (Sugar)
    </Node>
    <Node
      id="path"
      position={[95, -40]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ weight: 'bold' }}
    >
      Path (Kernel)
    </Node>
    <Node id="step" position={[250, -40]} stroke="dodgerblue" fill="dodgerblue" fillOpacity={0.08} cornerRadius={4}>
      Step
    </Node>
    <Node id="arrow" position={[95, 60]} stroke="dimgray" fill="lightgray" fillOpacity={0.12} cornerRadius={4}>
      Arrow
    </Node>

    <Draw way={['way', 'draw']} arrow="->" />
    <Draw
      way={[
        'draw',
        { label: { text: 'expand', sloped: true, side: 'top', textColor: 'gray', font: { size: 12 } } },
        'path',
      ]}
      arrow="->"
    />
    <Draw way={['path', 'step']} arrow="<->" />
    <Draw way={['arrow', 'path']} arrow="->" dashPattern={[4, 3]} stroke="gray" />
  </Layout>
);

export default Demo;
