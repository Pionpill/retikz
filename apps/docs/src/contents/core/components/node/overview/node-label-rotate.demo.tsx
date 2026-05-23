import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * label rotate 标签自旋
 * @description 同一圈四向标签：左侧 `'radial'` 让每个标签转到"指向外"的朝向，右侧 `'tangent'` 取其切向（radial + 90°）；`rotate` 只改朝向，不改由 `position` 决定的位置。
 */
const Demo: FC = () => (
  <Layout width={460} height={220}>
    {/* radial：标签沿"节点中心 → 标签中心"方向 */}
    <Node
      id="r"
      shape="circle"
      position={[-120, 0]}
      minimumSize={50}
      fill="#dbeafe"
      stroke="#3b82f6"
      label={[
        { text: 'radial', position: 'above', rotate: 'radial' },
        { text: 'radial', position: 'right', rotate: 'radial' },
        { text: 'radial', position: 'below', rotate: 'radial' },
        { text: 'radial', position: 'left', rotate: 'radial' },
      ]}
    >
      radial
    </Node>
    {/* tangent：radial 的切向（+90°） */}
    <Node
      id="t"
      shape="circle"
      position={[120, 0]}
      minimumSize={50}
      fill="#dcfce7"
      stroke="#10b981"
      label={[
        { text: 'tangent', position: 'above', rotate: 'tangent' },
        { text: 'tangent', position: 'right', rotate: 'tangent' },
        { text: 'tangent', position: 'below', rotate: 'tangent' },
        { text: 'tangent', position: 'left', rotate: 'tangent' },
      ]}
    >
      tangent
    </Node>
  </Layout>
);

export default Demo;
