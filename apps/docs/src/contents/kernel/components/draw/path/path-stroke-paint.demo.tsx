import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

const Demo: FC = () => (
  <Layout width={420} height={180}>
    <Path
      stroke={{
        kind: 'linearGradient',
        angle: 90,
        stops: [
          { offset: 0, color: '#2563eb' },
          { offset: 0.5, color: '#f59e0b' },
          { offset: 1, color: '#e11d48' },
        ],
      }}
      strokeWidth={10}
      lineCap="round"
      dashPattern={[12, 8]}
    >
      <Step kind="move" to={[-160, 30]} />
      <Step kind="curve" control={[0, -90]} to={[160, -20]} />
    </Path>
  </Layout>
);

export default Demo;
