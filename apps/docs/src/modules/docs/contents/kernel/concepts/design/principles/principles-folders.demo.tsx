import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Core 源码目录的数据主线与能力依赖 */
const Demo: FC = () => (
  <Layout width={760} height={290} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="parsers"
      position={[-270, 30]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      text={[{ text: 'parsers/', font: { size: 14, weight: 'bold' } }, 'sugar → IR']}
    />
    <Node
      id="ir"
      position={[-115, 30]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      IR
    </Node>
    <Node
      id="compile"
      position={[70, 30]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      text={[{ text: 'compile/', font: { size: 14, weight: 'bold' } }, 'IR → Scene']}
    />
    <Node
      id="scene"
      position={[255, 30]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      Scene
    </Node>

    <Node
      id="schemas"
      position={[-115, -65]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      text={[{ text: 'schemas/', font: { size: 14, weight: 'bold' } }, 'IR truth']}
    />
    <Node
      id="contract"
      position={[70, -108]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      text={[{ text: 'contract/', font: { size: 14, weight: 'bold' } }, 'Definition protocol']}
    />
    <Node
      id="shared"
      position={[0, 112]}
      minimumSize={{ width: 620, height: 42 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      shared/ · pure vocabulary + utilities
    </Node>
    <Node
      id="providers"
      position={[70, -43]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      text={[{ text: 'providers/', font: { size: 14, weight: 'bold' } }, 'built-ins + registry']}
    />

    <Draw way={['parsers', 'ir']} arrow="->" />
    <Draw way={['ir', 'compile']} arrow="->" />
    <Draw way={['compile', 'scene']} arrow="->" />

    <Draw
      way={[
        'schemas',
        {
          label: {
            text: 'defines',
            position: 'midway',
            side: 'right',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'ir',
      ]}
      arrow="->"
      stroke="gray"
      dashPattern={[4, 3]}
    />
    <Draw way={['contract', 'providers']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['providers', 'compile']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
