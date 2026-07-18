import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Layout 渲染后端与动画模式的回退优先级图 */
const Demo: FC = () => (
  <Layout width={560} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="renderer-prop"
      position={[-150, -75]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      1 · renderer prop
    </Node>
    <Node
      id="renderer-provider"
      position={[-150, -20]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      2 · Renderer Provider
    </Node>
    <Node
      id="renderer-default"
      position={[-150, 35]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      3 · 默认 'svg'
    </Node>
    <Node
      id="renderer-result"
      position={[-150, 95]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 15, weight: 'bold' }}
    >
      SVG / Canvas
    </Node>
    <Node
      id="snapshot"
      position={[150, -105]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      1 · snapshotAt
    </Node>
    <Node
      id="animation-provider"
      position={[150, -50]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      2 · Animation Provider
    </Node>
    <Node
      id="animate-prop"
      position={[150, 5]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      3 · animate prop
    </Node>
    <Node
      id="system-motion"
      position={[150, 60]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      4 · 系统偏好
    </Node>
    <Node
      id="animation-result"
      position={[150, 115]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 15, weight: 'bold' }}
    >
      静态 / 播放
    </Node>

    <Draw way={['renderer-prop', 'renderer-provider']} arrow="->" />
    <Draw way={['renderer-provider', 'renderer-default']} arrow="->" />
    <Draw way={['renderer-default', 'renderer-result']} arrow="->" />
    <Draw way={['snapshot', 'animation-provider']} arrow="->" />
    <Draw way={['animation-provider', 'animate-prop']} arrow="->" />
    <Draw way={['animate-prop', 'system-motion']} arrow="->" />
    <Draw way={['system-motion', 'animation-result']} arrow="->" />
  </Layout>
);

export default Demo;
