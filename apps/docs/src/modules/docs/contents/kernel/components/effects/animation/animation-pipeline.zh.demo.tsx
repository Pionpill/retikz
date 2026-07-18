import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** AnimationTrack 从声明到后端播放或静态求值的局部流程图 */
const Demo: FC = () => (
  <Layout width={560} height={380} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="preset"
      position={[-150, -145]}
      text={['预设工厂', 'fadeIn()']}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="custom-track"
      position={[150, -145]}
      text={['手写轨道', 'JSON 数据']}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="track"
      position={[0, -75]}
      text={['AnimationTrack', '关键帧 + 时序']}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="scene"
      position={[0, -5]}
      text={['编译校验', 'Scene 动画轨道']}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="route"
      position={[0, 65]}
      text={['渲染分流', '播放 / 截帧']}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13, weight: 'bold' }}
    />
    <Node
      id="svg"
      position={[-180, 145]}
      text={['SVG', 'CSS / WAAPI']}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="canvas"
      position={[0, 145]}
      text={['Canvas', 'rAF + 求值器']}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="snapshot"
      position={[180, 145]}
      text={['静态帧', 'snapshotAt']}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 13 }}
    />

    <Draw way={['preset', 'track']} arrow="->" stroke="gray" />
    <Draw way={['custom-track', 'track']} arrow="->" stroke="gray" />
    <Draw way={['track', 'scene']} arrow="->" stroke="gray" />
    <Draw way={['scene', 'route']} arrow="->" stroke="gray" />
    <Draw way={['route', 'svg']} arrow="->" stroke="gray" />
    <Draw way={['route', 'canvas']} arrow="->" stroke="gray" />
    <Draw way={['route', 'snapshot']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
