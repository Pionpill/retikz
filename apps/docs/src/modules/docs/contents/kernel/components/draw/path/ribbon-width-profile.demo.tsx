import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

const Demo: FC = () => (
  <Layout width={560} height={260} viewBox={{ x: -280, y: -130, width: 560, height: 260 }} color="#172033">
    <Path
      kind="ribbon"
      ribbon={{
        width: { kind: 'profile', name: 'bulge', params: { base: 14, peak: 58 } },
        sampling: { kind: 'fixed', samples: 33 },
      }}
      fill="#38bdf8"
      fillOpacity={0.72}
      stroke="#075985"
      strokeWidth={1}
      strokeOpacity={0.24}
    >
      <Step kind="move" to={[-220, -48]} />
      <Step kind="curve" control={[0, -86]} to={[220, -48]} />
    </Path>

    <Path
      kind="ribbon"
      ribbon={{
        width: { kind: 'profile', name: 'bulge', params: { base: 54, peak: 14 } },
        sampling: { kind: 'fixed', samples: 33 },
      }}
      fill="#a78bfa"
      fillOpacity={0.72}
      stroke="#5b21b6"
      strokeWidth={1}
      strokeOpacity={0.24}
    >
      <Step kind="move" to={[-220, 58]} />
      <Step kind="curve" control={[0, 20]} to={[220, 58]} />
    </Path>
  </Layout>
);

export default Demo;
