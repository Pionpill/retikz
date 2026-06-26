import type { FC } from 'react';

import { Layout, Node, Ribbon, Step } from '@retikz/react';

const rows = [
  { label: 'center / butt', y: -70, align: 'center' as const, start: { cap: 'butt' as const }, end: { cap: 'butt' as const }, fill: '#60a5fa' },
  { label: 'left / square', y: 0, align: 'left' as const, start: { cap: 'square' as const }, end: { cap: 'square' as const }, fill: '#43aa8b' },
  { label: 'right / round', y: 70, align: 'right' as const, start: { cap: 'round' as const }, end: { cap: 'round' as const }, fill: '#f9844a' },
];

const Demo: FC = () => (
  <Layout
    width={560}
    height={280}
    viewBox={{ x: -280, y: -140, width: 560, height: 280 }}
    color="#172033"
  >
    {rows.map(row => (
      <Ribbon
        key={row.label}
        width={22}
        align={row.align}
        start={row.start}
        end={row.end}
        fill={row.fill}
        fillOpacity={0.76}
        stroke="#172033"
        strokeWidth={0.8}
        drawOpacity={0.2}
        samples={64}
      >
        <Step kind="move" to={[-152, row.y - 18]} />
        <Step kind="curve" control={[20, row.y - 36]} to={[222, row.y + 18]} />
      </Ribbon>
    ))}

    {rows.map(row => (
      <Node
        key={`${row.label}-label`}
        position={[-226, row.y]}
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
