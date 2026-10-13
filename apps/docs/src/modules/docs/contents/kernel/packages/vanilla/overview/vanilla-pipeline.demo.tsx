import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/** @retikz/vanilla 将 InputScene 归一为 Core IR，再交给 Core 编译为 Scene */
const Demo: FC = () => (
  <Layout>
    <Node
      id="spec"
      position={[-360, 0]}
      text={['InputScene', 'framework-neutral']}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', font: { size: 12 }, opacity: { fill: 0.08 } }}
      layout={{ padding: 8 }}
    />
    <Node
      id="normalize"
      position={[-215, 0]}
      text={['Vanilla normalize', 'normalizeScene']}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', font: { size: 12, weight: 'bold' }, opacity: { fill: 0.08 } }}
      layout={{ padding: 8 }}
    />
    <Node
      id="ir"
      position={[-65, 0]}
      text={['Core IR', 'JSON contract']}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', font: { size: 12 }, opacity: { fill: 0.08 } }}
      layout={{ padding: 8 }}
    />
    <Node
      id="compile"
      position={[75, 0]}
      text={['Core compiler', 'compileToScene']}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', font: { size: 12 }, opacity: { fill: 0.08 } }}
      layout={{ padding: 8 }}
    />
    <Node
      id="scene"
      position={[220, 0]}
      text={['Scene', 'backend-neutral']}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', font: { size: 12 }, opacity: { fill: 0.08 } }}
      layout={{ padding: 8 }}
    />
    <Node
      id="output"
      position={[365, 0]}
      text={['SVG / Canvas', 'DOM or string']}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'gray', font: { size: 12 }, opacity: { fill: 0.08 } }}
      layout={{ padding: 8 }}
    />

    <Draw way={['spec', 'normalize']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['normalize', 'ir']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['ir', 'compile']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['compile', 'scene']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['scene', 'output']} arrow="->" style={{ stroke: 'gray' }} />
  </Layout>
);

export default Demo;
