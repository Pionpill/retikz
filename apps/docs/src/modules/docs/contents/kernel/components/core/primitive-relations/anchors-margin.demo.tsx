import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/**
 * margin 对连接端点的作用
 * @description 三组对照：1) 无 margin，auto 端点贴视觉 border；
 *   2) 有 margin，auto 是 border 锚点 → 整体外移，留出间隙；
 *   3) 同样有 margin，但用 `{ side, fraction }` 边点 → 取视觉 border、不吃 margin，仍贴死。
 */
const Demo: FC = () => (
  <Layout>
    {/* 无 margin：auto 端点贴视觉 border */}
    <Node id="a1" position={[-270, -10]} style={{ stroke: 'gray', dashPattern: [4, 3] }} layout={{ padding: 10 }}>
      a
    </Node>
    <Node id="b1" position={[-160, -10]} style={{ stroke: 'gray', dashPattern: [4, 3] }} layout={{ padding: 10 }}>
      b
    </Node>
    <Draw way={['a1', 'b1']} style={{ stroke: 'currentColor', strokeWidth: 2 }} />

    {/* margin：border 锚点（auto）整体外移，留出间隙 */}
    <Node
      id="a2"
      position={[-40, -10]}
      style={{ stroke: 'gray', dashPattern: [4, 3] }}
      layout={{ padding: 10, margin: 12 }}
    >
      a
    </Node>
    <Node
      id="b2"
      position={[70, -10]}
      style={{ stroke: 'gray', dashPattern: [4, 3] }}
      layout={{ padding: 10, margin: 12 }}
    >
      b
    </Node>
    <Draw way={['a2', 'b2']} style={{ stroke: 'currentColor', strokeWidth: 2 }} />

    {/* margin + { side, fraction }：边点取视觉 border，不吃 margin，仍贴死 */}
    <Node
      id="a3"
      position={[190, -10]}
      style={{ stroke: 'gray', dashPattern: [4, 3] }}
      layout={{ padding: 10, margin: 12 }}
    >
      a
    </Node>
    <Node
      id="b3"
      position={[300, -10]}
      style={{ stroke: 'gray', dashPattern: [4, 3] }}
      layout={{ padding: 10, margin: 12 }}
    >
      b
    </Node>
    <Draw
      way={[
        { id: 'a3', anchor: { side: 'right', fraction: 0.5 } },
        { id: 'b3', anchor: { side: 'left', fraction: 0.5 } },
      ]}
      style={{ stroke: 'currentColor', strokeWidth: 2 }}
    />

    <Node position={[-215, 42]} style={{ stroke: 'none', textColor: 'gray' }} layout={{ padding: 0 }}>
      margin 0
    </Node>
    <Node position={[15, 42]} style={{ stroke: 'none', textColor: 'gray' }} layout={{ padding: 0 }}>
      margin · border anchor
    </Node>
    <Node position={[245, 42]} style={{ stroke: 'none', textColor: 'gray' }} layout={{ padding: 0 }}>
      margin · {'{ side, fraction }'}
    </Node>
  </Layout>
);

export default Demo;
