import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** RegularPolygon 从尺寸输入展开为闭合 Path 的局部流程图 */
const Demo: FC = () => (
  <Layout width={380} height={300} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="radius-input"
      position={[-105, -80]}
      text={['center', '+ radius']}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    />
    <Node
      id="side-input"
      position={[-105, 0]}
      text={['center', '+ sideLength']}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    />
    <Node
      id="angle-input"
      position={[-105, 80]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      sides + rotate
    </Node>
    <Node
      id="vertices"
      position={[85, 0]}
      text={['regular', 'vertex ring']}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    />
    <Node
      id="path"
      position={[85, 100]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      closed Path
    </Node>

    <Draw way={['radius-input', 'vertices']} arrow="->" stroke="gray" />
    <Draw
      way={[
        'side-input',
        { label: { text: 'solve R', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'vertices',
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw way={['angle-input', 'vertices']} arrow="->" stroke="gray" />
    <Draw way={['vertices', 'path']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
