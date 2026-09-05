import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Node polygon 从内容内框收敛为渲染与连接轮廓的局部流程图 */
const Demo: FC = () => (
  <Layout width={390} height={360} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="inner-box"
      position={[0, -140]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 14 } }}
    >
      text + padding
    </Node>
    <Node
      id="shape-params"
      position={[-125, -60]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 14 } }}
    >
      sides + rotate
    </Node>
    <Node
      id="diamond"
      position={[-125, 30]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 14 } }}
    >
      diamond preset
    </Node>
    <Node
      id="fit"
      position={[0, -60]}
      text={['fit', 'circumradius']}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'lightgray', fillOpacity: 0.16, font: { size: 14, weight: 'bold' } }}
    />
    <Node
      id="rounding"
      position={[125, 35]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 14 } }}
    >
      cornerRadius
    </Node>
    <Node
      id="contour"
      position={[0, 35]}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'lightgray', fillOpacity: 0.16, font: { size: 14 } }}
    >
      rounded contour
    </Node>
    <Node
      id="scene-path"
      position={[-85, 135]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 14 } }}
    >
      Scene Path
    </Node>
    <Node
      id="boundary-hit"
      position={[85, 135]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 14 } }}
    >
      boundary hit
    </Node>

    <Draw way={['inner-box', 'fit']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['shape-params', 'fit']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw
      way={[
        'diamond',
        { label: { text: '4 / 0', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'shape-params',
      ]}
      arrow="->"
      style={{ stroke: 'gray', dashPattern: [4, 3] }}
    />
    <Draw
      way={[
        'fit',
        { label: { text: 'circumscribe', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'contour',
      ]}
      arrow="->"
      style={{ stroke: 'gray' }}
    />
    <Draw
      way={[
        'rounding',
        { label: { text: 'fillet', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'contour',
      ]}
      arrow="->"
      style={{ stroke: 'gray', dashPattern: [4, 3] }}
    />
    <Draw
      way={[
        'contour',
        { label: { text: 'emit', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'scene-path',
      ]}
      arrow="->"
      style={{ stroke: 'gray' }}
    />
    <Draw
      way={[
        'contour',
        { label: { text: 'intersect', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'boundary-hit',
      ]}
      arrow="->"
      style={{ stroke: 'gray' }}
    />
  </Layout>
);

export default Demo;
