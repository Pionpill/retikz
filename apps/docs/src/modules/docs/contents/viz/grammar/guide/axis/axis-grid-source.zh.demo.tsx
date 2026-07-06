import type { FC } from 'react';

import { Axis, PathMark, Plot } from '@retikz/plot-react';

import { speedEfficiency } from './axis-grid-source.data';

/** 网格来源：轴刻度保持稀疏，网格使用独立 tick source，并补一层次网格 */
const Demo: FC = () => (
  <Plot data={speedEfficiency} width={380} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <PathMark x="speed" y="efficiency" order="speed" stroke="#2563eb" strokeWidth={1.6} />
    <Axis
      dimension="x"
      title="速度"
      ticks={{ values: [0, 50, 100] }}
      grid={{
        ticks: { interval: { kind: 'number', step: 20 } },
        stroke: '#94a3b8',
        drawOpacity: 0.5,
        lineCap: 'round',
        minor: {
          ticks: { interval: { kind: 'number', step: 10 } },
          stroke: '#cbd5e1',
          drawOpacity: 0.35,
          dashPattern: [2, 3],
        },
      }}
    />
    <Axis dimension="y" title={{ text: '效率', orientation: 'horizontal', placement: 'at-end' }} />
  </Plot>
);

export default Demo;
