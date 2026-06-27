import type { FC } from 'react';

import { Layout, Node, Path, Step } from '@retikz/react';

const labelStyle = {
  fill: 'none',
  stroke: 'none',
  textColor: '#5f6c7b',
  font: { size: 13, weight: 'bold' },
} as const;

const rows = [
  { label: 'default', y: -78, fill: '#5dade2' },
  { label: 'angle', y: 0, fill: '#8ac926', start: { direction: 0 }, end: { direction: 0 } },
  {
    label: 'vector / polar',
    y: 78,
    fill: '#ffb703',
    start: { direction: [1, 0] as [number, number] },
    end: { direction: { angle: 0, radius: 1 } },
  },
];

const Demo: FC = () => (
  <Layout
    width={560}
    height={300}
    viewBox={{ x: -280, y: -150, width: 560, height: 300 }}
    color="#172033"
  >
    {rows.map(row => (
      <Path
        key={row.label}
        kind="ribbon"
        ribbon={{
          width: 28,
          start: row.start,
          end: row.end,
          samples: 64,
        }}
        fill={row.fill}
        fillOpacity={0.78}
        stroke="#172033"
        strokeWidth={0.8}
        drawOpacity={0.18}
      >
        <Step kind="move" to={[-150, row.y - 28]} />
        <Step kind="curve" control={[8, row.y - 58]} to={[214, row.y + 22]} />
      </Path>
    ))}

    {rows.map(row => (
      <Node key={`${row.label}-label`} position={[-224, row.y]} {...labelStyle}>
        {row.label}
      </Node>
    ))}
  </Layout>
);

export default Demo;
