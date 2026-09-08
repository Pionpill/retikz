import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Node 从 props 收敛到可见图元与命名几何的流程图 */
const Demo: FC = () => (
  <Layout>
    <Node
      id="props"
      position={[-205, -55]}
      cornerRadius={4}
      text={['Node props', 'position · content · geometry']}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 14 } }}
    />
    <Node
      id="definitions"
      position={[-205, 70]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 14 } }}
    >
      shape / boundary definitions
    </Node>
    <Node
      id="layout"
      position={[-10, 0]}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'lightgray', fillOpacity: 0.16, font: { size: 15, weight: 'bold' } }}
    >
      Resolved Node layout
    </Node>
    <Node
      id="primitives"
      position={[195, -75]}
      cornerRadius={4}
      text={['Scene primitives', 'shape · text · labels']}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 14 } }}
    />
    <Node
      id="geometry"
      position={[195, 20]}
      cornerRadius={4}
      text={['Named geometry', 'id · anchors · boundary']}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 14 } }}
    />
    <Node
      id="consumers"
      position={[195, 110]}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'lightgray', fillOpacity: 0.16, font: { size: 14 } }}
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
    <Draw way={['definitions', 'layout']} arrow="->" style={{ stroke: 'gray', dashPattern: [4, 3] }} />
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
      style={{ stroke: 'gray', dashPattern: [4, 3] }}
    />
    <Draw way={['geometry', 'consumers']} arrow="->" />
  </Layout>
);

export default Demo;
