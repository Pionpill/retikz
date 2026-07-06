import type { FC } from 'react';

import { Layout, Node, Path, Step } from '@retikz/react';

const rows = [
  {
    label: 'linear',
    y: -78,
    width: undefined,
    start: { width: 14 },
    end: { width: 42 },
    interpolation: 'linear' as const,
    fill: '#5dade2',
  },
  {
    label: 'smooth',
    y: 0,
    width: undefined,
    start: { width: 14 },
    end: { width: 42 },
    interpolation: 'smooth' as const,
    fill: '#8ac926',
  },
  {
    label: 'step',
    y: 78,
    start: undefined,
    end: undefined,
    interpolation: undefined,
    width: {
      kind: 'stops' as const,
      stops: [
        { offset: 0, value: 14 },
        { offset: 0.55, value: 42 },
        { offset: 1, value: 42 },
      ],
      interpolation: 'step' as const,
    },
    fill: '#ffb703',
  },
];

const Demo: FC = () => (
  <Layout width={560} height={300} viewBox={{ x: -280, y: -150, width: 560, height: 300 }} color="#172033">
    {rows.map(row => (
      <Path
        key={row.label}
        kind="ribbon"
        ribbon={{
          width: row.width,
          start: row.start,
          end: row.end,
          interpolation: row.interpolation,
        }}
        fill={row.fill}
        fillOpacity={0.78}
        stroke="#172033"
        strokeWidth={0.8}
        strokeOpacity={0.18}
      >
        <Step kind="move" to={[-182, row.y - 24]} />
        <Step kind="curve" control={[12, row.y - 42]} to={[226, row.y + 24]} />
      </Path>
    ))}

    {rows.map(row => (
      <Node
        key={`${row.label}-label`}
        position={[-232, row.y]}
        fill="none"
        stroke="none"
        textColor="#5f6c7b"
        font={{ size: 13, weight: 'bold' }}
      >
        {row.label}
      </Node>
    ))}
  </Layout>
);

export default Demo;
