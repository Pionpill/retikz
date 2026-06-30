import type { IRPathRibbonOptions } from '@retikz/core';
import type { FC } from 'react';

import { Layout, Node, Path, Step } from '@retikz/react';

type Row = {
  label: string;
  y: number;
  align: NonNullable<IRPathRibbonOptions['align']>;
  start: NonNullable<IRPathRibbonOptions['start']>;
  end: NonNullable<IRPathRibbonOptions['end']>;
  fill: string;
  path: 'curve' | 'line';
};

const LEFT_X = -152;
const RIGHT_X = 222;
const ARC_RADIUS = 11;

const rows = [
  {
    label: 'center / butt',
    y: -105,
    align: 'center',
    start: { cap: 'butt' },
    end: { cap: 'butt' },
    fill: '#60a5fa',
    path: 'curve',
  },
  {
    label: 'left / square',
    y: -35,
    align: 'left',
    start: { cap: 'square' },
    end: { cap: 'square' },
    fill: '#43aa8b',
    path: 'curve',
  },
  {
    label: 'right / round',
    y: 35,
    align: 'right',
    start: { cap: 'round' },
    end: { cap: 'round' },
    fill: '#f9844a',
    path: 'curve',
  },
  {
    label: 'center / arc',
    y: 105,
    align: 'center',
    start: { cap: { type: 'arc', center: [LEFT_X, 105], radius: ARC_RADIUS, sweep: 'long' } },
    end: { cap: { type: 'arc', center: [RIGHT_X, 105], radius: ARC_RADIUS } },
    fill: '#8b5cf6',
    path: 'line',
  },
] satisfies Array<Row>;

const Demo: FC = () => (
  <Layout width={560} height={340} viewBox={{ x: -280, y: -170, width: 560, height: 340 }} color="#172033">
    {rows.map(row => (
      <Path
        key={row.label}
        kind="ribbon"
        ribbon={{
          width: 22,
          align: row.align,
          start: row.start,
          end: row.end,
          samples: 64,
        }}
        fill={row.fill}
        fillOpacity={0.76}
        stroke="#172033"
        strokeWidth={0.8}
        drawOpacity={0.2}
      >
        {row.path === 'curve' ? (
          <>
            <Step kind="move" to={[LEFT_X, row.y - 18]} />
            <Step kind="curve" control={[20, row.y - 36]} to={[RIGHT_X, row.y + 18]} />
          </>
        ) : (
          <>
            <Step kind="move" to={[LEFT_X, row.y]} />
            <Step kind="line" to={[RIGHT_X, row.y]} />
          </>
        )}
      </Path>
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
