import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

const Demo: FC = () => (
  <Layout>
    {/* 左：user units 世界 + viewBox 选中的窗口 */}
    <Node
      id="world"
      position={[-110, 0]}
      shape="rectangle"
      style={{ fill: 'none', stroke: 'gray' }}
      layout={{ minimumSize: { width: 120, height: 110 } }}
    />
    <Node
      id="window"
      position={[-100, 5]}
      shape="rectangle"
      style={{ fill: 'none', stroke: 'currentColor', dashed: true }}
      layout={{ minimumSize: { width: 74, height: 58 } }}
    />
    <Node
      id="content-a"
      position={[-105, 14]}
      shape="circle"
      style={{ fill: 'currentColor', stroke: 'none' }}
      layout={{ minimumSize: 5, padding: 0 }}
    />
    <Node id="window-label" position={[-100, -40]} style={{ stroke: 'none' }}>
      viewBox
    </Node>
    <Node id="world-label" position={[-110, 72]} style={{ stroke: 'none', textColor: 'gray' }}>
      user units 世界
    </Node>

    {/* 右：按 width / height 渲染的画面 */}
    <Node
      id="page"
      position={[112, 0]}
      shape="rectangle"
      style={{ fill: 'none', stroke: 'gray' }}
      layout={{ minimumSize: { width: 104, height: 82 } }}
    />
    <Node
      id="content-b"
      position={[105, 13]}
      shape="circle"
      style={{ fill: 'currentColor', stroke: 'none' }}
      layout={{ minimumSize: 5, padding: 0 }}
    />
    <Node id="page-label" position={[112, 72]} style={{ stroke: 'none', textColor: 'gray' }}>
      width × height 渲染
    </Node>

    <Draw
      way={['world', { label: { text: '渲染', side: 'top', textColor: 'gray', font: { size: 12 } } }, 'page']}
      arrow="->"
      style={{ stroke: 'gray' }}
    />
  </Layout>
);

export default Demo;
