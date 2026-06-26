import type { FC } from 'react';

import { Layout, Ribbon, Step } from '@retikz/react';

const Demo: FC = () => (
  <Layout
    width={560}
    height={240}
    viewBox={{ x: -280, y: -120, width: 560, height: 240 }}
    color="#172033"
  >
    <Ribbon
      width={{ start: 44, end: 18, interpolation: 'smooth' }}
      fill="#5dade2"
      fillOpacity={0.84}
      samples={48}
    >
      <Step kind="move" to={[-220, -70]} />
      <Step kind="curve" control={[8, -8]} to={[220, 76]} />
    </Ribbon>
  </Layout>
);

export default Demo;
