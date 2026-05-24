import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 渐变 stops：opacity 渐隐 + currentColor
 * @description 左：同色 stop 用 opacity 1 → 0 做"实色到透明"渐隐；右：stop color 用 currentColor，
 *   跟随元素 color（这里由 <Layout style={{ color }}> 提供），主题切换自动生效。
 */
const Demo: FC = () => (
  <Layout width={420} height={180} style={{ color: '#7c3aed' }}>
    {/* opacity：实色 → 透明 */}
    <Node
      id="fade"
      position={[-100, 0]}
      shape="rectangle"
      minimumWidth={110}
      minimumHeight={80}
      stroke="none"
      fill={{
        type: 'linearGradient',
        angle: 0,
        stops: [
          { offset: 0, color: '#1466a8', opacity: 1 },
          { offset: 1, color: '#1466a8', opacity: 0 },
        ],
      }}
    />
    {/* currentColor：跟随 color（紫） */}
    <Node
      id="theme"
      position={[100, 0]}
      shape="circle"
      minimumSize={90}
      stroke="none"
      fill={{
        type: 'radialGradient',
        stops: [
          { offset: 0, color: '#ffffff' },
          { offset: 1, color: 'currentColor' },
        ],
      }}
    />
  </Layout>
);

export default Demo;
