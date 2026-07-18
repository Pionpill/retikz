import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** AnimationTrack 从声明到后端播放或静态求值的局部流程图 */
const Demo: FC = () => (
  <Layout width={560} height={380} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="preset"
      position={[-150, -145]}
      text={['Preset factory', 'fadeIn()']}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="custom-track"
      position={[150, -145]}
      text={['Hand-written track', 'JSON data']}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="track"
      position={[0, -75]}
      text={['AnimationTrack', 'keyframes + timing']}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="scene"
      position={[0, -5]}
      text={['Compile validation', 'Scene tracks']}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="route"
      position={[0, 65]}
      text={['Render routing', 'play / snapshot']}
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
      text={['Canvas', 'rAF + evaluator']}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="snapshot"
      position={[180, 145]}
      text={['Static frame', 'snapshotAt']}
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
