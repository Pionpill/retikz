import { Draw, Layout, Node } from '@retikz/react';
import { Surface } from '@retikz/standard-react/presentation';
import type { FC } from 'react';

/** 用相同内容对比 Surface 的视觉溢出与圆角裁剪 */
const Demo: FC = () => (
  <Layout>
    <Surface
      id="visible-overflow"
      position={[-136, 0]}
      padding={6}
      background={{ fill: 'currentColor', fillOpacity: 0.04 }}
      border={{ stroke: 'gray' }}
      cornerRadius={14}
      overflow="visible"
    >
      <Draw
        way={[
          [0, 0],
          [50, 36],
          [100, 0],
        ]}
        style={{ stroke: 'dodgerblue', strokeWidth: 24, lineCap: 'round', lineJoin: 'round' }}
      />
    </Surface>
    <Node position={[-80, 78]} text="visible" style={{ stroke: 'none', fill: 'none' }} />
    <Surface
      id="clipped-overflow"
      position={[24, 0]}
      padding={6}
      background={{ fill: 'currentColor', fillOpacity: 0.04 }}
      border={{ stroke: 'gray' }}
      cornerRadius={14}
      overflow="clip"
    >
      <Draw
        way={[
          [0, 0],
          [50, 36],
          [100, 0],
        ]}
        style={{ stroke: 'dodgerblue', strokeWidth: 24, lineCap: 'round', lineJoin: 'round' }}
      />
    </Surface>
    <Node position={[80, 78]} text="clip" style={{ stroke: 'none', fill: 'none' }} />
  </Layout>
);

export default Demo;
