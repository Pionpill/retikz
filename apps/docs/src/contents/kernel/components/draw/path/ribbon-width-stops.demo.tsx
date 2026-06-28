import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

const Demo: FC = () => (
  <Layout width={560} height={240} viewBox={{ x: -280, y: -120, width: 560, height: 240 }} color="#172033">
    <Path
      kind="ribbon"
      ribbon={{
        width: {
          kind: 'stops',
          stops: [
            { offset: 0, value: 46 },
            { offset: 0.5, value: 12 },
            { offset: 1, value: 42 },
          ],
          interpolation: 'smooth',
        },
        samples: true,
      }}
      fill="#80ed99"
      fillOpacity={0.78}
      stroke="#14532d"
      strokeWidth={1.2}
      drawOpacity={0.22}
    >
      <Step kind="move" to={[-220, 0]} />
      <Step to={[220, 0]} />
    </Path>
  </Layout>
);

export default Demo;
