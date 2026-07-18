import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Node 从 props 收敛到可见图元与命名几何的流程图 */
const Demo: FC = () => (
  <Layout width={560} height={290} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="props"
      position={[-205, -55]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
      text={['Node props', 'position · content · geometry']}
    />
    <Node
      id="definitions"
      position={[-205, 70]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      shape / boundary definitions
    </Node>
    <Node
      id="layout"
      position={[-10, 0]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 15, weight: 'bold' }}
    >
      Resolved Node layout
    </Node>
    <Node
      id="primitives"
      position={[195, -75]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
      text={['Scene primitives', 'shape · text · labels']}
    />
    <Node
      id="geometry"
      position={[195, 20]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
      text={['Named geometry', 'id · anchors · boundary']}
    />
    <Node
      id="consumers"
      position={[195, 110]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      Path / Draw
    </Node>

    <Draw
      way={[
        'props',
        { label: { text: 'resolve + measure', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'layout',
      ]}
      arrow="->"
    />
    <Draw way={['definitions', 'layout']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw
      way={[
        'layout',
        { label: { text: 'emit', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'primitives',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'layout',
        { label: { text: 'register', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'geometry',
      ]}
      arrow="->"
      stroke="gray"
      dashPattern={[4, 3]}
    />
    <Draw way={['geometry', 'consumers']} arrow="->" />
  </Layout>
);

export default Demo;
