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
      start={{ width: 44 }}
      end={{ width: 18 }}
      interpolation="smooth"
      fill="#5dade2"
      fillOpacity={0.84}
    >
      <Step kind="move" to={[-220, 0]} />
      <Step to={[220, 0]} />
    </Ribbon>
  </Layout>
);

export default Demo;
