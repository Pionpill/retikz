import type { FC } from 'react';

import { Layout, Ribbon, Step } from '@retikz/react';

const Demo: FC = () => (
  <Layout
    width={560}
    height={260}
    viewBox={{ x: -280, y: -130, width: 560, height: 260 }}
    color="#172033"
  >
    <Ribbon
      start={{ width: 42 }}
      end={{ width: 20 }}
      interpolation="smooth"
      fill="#38bdf8"
      fillOpacity={0.62}
      label={{
        text: '128 件',
        position: 'midway',
        placement: 'inside',
        sloped: true,
        textColor: '#0f172a',
        font: { size: 14, weight: 'bold' },
      }}
      samples
    >
      <Step kind="move" to={[-210, -48]} />
      <Step kind="cubic" control1={[-80, -100]} control2={[80, 38]} to={[210, 16]} />
    </Ribbon>

    <Ribbon
      width={18}
      fill="#f59e0b"
      fillOpacity={0.48}
      stroke="#92400e"
      strokeWidth={1.6}
      label={[
        {
          text: '起点',
          position: 'near-start',
          side: 'above',
          sloped: true,
          textColor: '#92400e',
          font: { size: 11, weight: 'bold' },
        },
        {
          text: '75%',
          position: 0.75,
          placement: 'inside',
          sloped: true,
          textColor: '#92400e',
          font: { size: 11, weight: 'bold' },
        },
      ]}
    >
      <Step kind="move" to={[-210, 56]} />
      <Step to={[210, -36]} />
    </Ribbon>
  </Layout>
);

export default Demo;
