import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Local flow from Arc / Sector Node params to geometry capabilities */
const Demo: FC = () => (
  <Layout width={580} height={300} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="params"
      position={[-225, -25]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      Node shape + params
    </Node>
    <Node
      id="geometry"
      position={[-35, -25]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 13, weight: 'bold' }}
    >
      Shape geometry / contour
    </Node>
    <Node
      id="aabb"
      position={[165, -78]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      Exact AABB
    </Node>
    <Node
      id="anchors"
      position={[165, -26]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      Named anchors
    </Node>
    <Node
      id="boundary"
      position={[165, 26]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      Connection boundary
    </Node>
    <Node
      id="scene"
      position={[165, 78]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      Scene path
    </Node>
    <Node
      id="toward"
      position={[-35, 78]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      Connection target
    </Node>

    <Draw
      way={[
        'params',
        { label: { text: 'derive', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'geometry',
      ]}
      arrow="->"
    />
    <Draw way={['geometry', 'aabb']} arrow="->" />
    <Draw way={['geometry', 'anchors']} arrow="->" />
    <Draw way={['geometry', 'boundary']} arrow="->" />
    <Draw way={['geometry', 'scene']} arrow="->" />
    <Draw
      way={[
        'toward',
        { label: { text: 'toward', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'boundary',
      ]}
      arrow="->"
      stroke="gray"
      dashPattern={[4, 3]}
    />
  </Layout>
);

export default Demo;
