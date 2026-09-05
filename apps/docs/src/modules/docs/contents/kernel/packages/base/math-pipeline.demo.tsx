import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

const nodeStyle = {
  cornerRadius: 4,
  style: { fillOpacity: 0.08 },
  layout: { padding: 9 },
} as const;

/** 展示用户预计算路径与 core 对 math 的内部依赖 */
const Demo: FC = () => (
  <Layout
    width={620}
    height={210}
    viewBox={{ x: -320, y: -110, width: 640, height: 220 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <Node
      id="input"
      position={[-260, -45]}
      {...nodeStyle}
      style={{ stroke: 'gray', fill: 'lightgray', ...nodeStyle.style }}
    >
      number / tuple
    </Node>
    <Node
      id="math"
      position={[-125, 45]}
      {...nodeStyle}
      style={{ stroke: 'darkorange', fill: 'darkorange', font: { weight: 'bold' }, ...nodeStyle.style }}
    >
      @retikz/math
    </Node>
    <Node
      id="geometry"
      position={[5, -45]}
      {...nodeStyle}
      style={{ stroke: 'gray', fill: 'lightgray', ...nodeStyle.style }}
    >
      plain geometry
    </Node>
    <Node
      id="core"
      position={[150, -45]}
      {...nodeStyle}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', ...nodeStyle.style }}
    >
      @retikz/core
    </Node>
    <Node
      id="scene"
      position={[275, -45]}
      {...nodeStyle}
      style={{ stroke: 'gray', fill: 'lightgray', ...nodeStyle.style }}
    >
      Scene
    </Node>

    <Draw way={['input', 'math']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['math', 'geometry']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['geometry', 'core']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['core', 'scene']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw
      way={[
        'math',
        {
          label: {
            text: 'compiler dependency',
            side: 'bottom',
            sloped: true,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'core',
      ]}
      arrow="->"
      style={{ stroke: 'gray', dashPattern: [6, 4] }}
    />
  </Layout>
);

export default Demo;
