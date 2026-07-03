import type { FC } from 'react';

import { Layout, Node, Path, Step } from '@retikz/react';

const rows = [
  { label: 'offset 0', y: 0, dashOffset: 0 },
  { label: 'offset 8', y: 42, dashOffset: 8 },
  { label: 'offset -8', y: 84, dashOffset: -8 },
] as const;

const Demo: FC = () => (
  <Layout width={420} height={180}>
    {/* 起点参考线：三条虚线共用同一个 x 起点，只改 dashOffset */}
    <Path stroke="lightgray" strokeWidth={1}>
      <Step kind="move" to={[75, -18]} />
      <Step kind="line" to={[75, 104]} />
    </Path>

    {rows.map(row => (
      <Node key={row.label} position={[0, row.y]} stroke="none">
        {row.label}
      </Node>
    ))}

    {rows.map(row => (
      <Path
        key={row.label}
        stroke="currentColor"
        strokeWidth={4}
        dashPattern={[18, 10]}
        dashOffset={row.dashOffset}
        lineCap="butt"
      >
        <Step kind="move" to={[75, row.y]} />
        <Step kind="line" to={[340, row.y]} />
      </Path>
    ))}
  </Layout>
);

export default Demo;
