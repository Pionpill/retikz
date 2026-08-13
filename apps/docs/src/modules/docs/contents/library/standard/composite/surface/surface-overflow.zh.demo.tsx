import type { FC } from 'react';

import { Draw, Layout } from '@retikz/react';
import { Surface } from '@retikz/standard-react';

/** 对比 Surface visible 与 clip overflow 的中文示例 */
const Demo: FC = () => (
  <Layout width={520} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <Surface
      id="visible-overflow"
      transforms={[{ kind: 'translate', x: -145, y: 0 }]}
      padding={10}
      background={{ fill: '#eff6ff' }}
      border={{ stroke: '#2563eb' }}
      cornerRadius={10}
      overflow="visible"
    >
      <Draw
        way={[
          [0, 0],
          [120, 0],
        ]}
        stroke="#dc2626"
        strokeWidth={18}
      />
    </Surface>
    <Surface
      id="clipped-overflow"
      transforms={[{ kind: 'translate', x: 55, y: 0 }]}
      padding={10}
      background={{ fill: '#f0fdf4' }}
      border={{ stroke: '#16a34a' }}
      cornerRadius={10}
      overflow="clip"
    >
      <Draw
        way={[
          [0, 0],
          [120, 0],
        ]}
        stroke="#dc2626"
        strokeWidth={18}
      />
    </Surface>
  </Layout>
);

export default Demo;
