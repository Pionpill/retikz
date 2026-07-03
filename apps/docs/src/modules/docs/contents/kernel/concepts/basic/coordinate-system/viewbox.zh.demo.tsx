import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

const Demo: FC = () => (
  <Layout
    width={460}
    height={205}
    viewBox={{ x: -190, y: -66, width: 370, height: 158 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    {/* 左：user units 世界 + viewBox 选中的窗口 */}
    <Node
      id="world"
      position={[-110, 0]}
      shape="rectangle"
      minimumSize={{ width: 120, height: 110 }}
      fill="none"
      stroke="gray"
    />
    <Node
      id="window"
      position={[-100, 5]}
      shape="rectangle"
      minimumSize={{ width: 74, height: 58 }}
      fill="none"
      stroke="currentColor"
      dashed
    />
    <Node
      id="content-a"
      position={[-105, 14]}
      shape="circle"
      minimumSize={5}
      padding={0}
      fill="currentColor"
      stroke="none"
    />
    <Node id="window-label" position={[-100, -40]} stroke="none">
      viewBox
    </Node>
    <Node id="world-label" position={[-110, 72]} stroke="none" textColor="gray">
      user units 世界
    </Node>

    {/* 右：按 width / height 渲染的画面 */}
    <Node
      id="page"
      position={[112, 0]}
      shape="rectangle"
      minimumSize={{ width: 104, height: 82 }}
      fill="none"
      stroke="gray"
    />
    <Node
      id="content-b"
      position={[105, 13]}
      shape="circle"
      minimumSize={5}
      padding={0}
      fill="currentColor"
      stroke="none"
    />
    <Node id="page-label" position={[112, 72]} stroke="none" textColor="gray">
      width × height 渲染
    </Node>

    <Draw
      way={['world', { label: { text: '渲染', side: 'top', textColor: 'gray', font: { size: 12 } } }, 'page']}
      arrow="->"
      stroke="gray"
    />
  </Layout>
);

export default Demo;
