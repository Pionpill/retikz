import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark } from '@retikz/plot-react';

// 输入顺序故意打乱，用于展示 order 会在每个 series 内恢复连接顺序
const rows = [
  { step: 3, value: 18, series: 'B' },
  { step: 2, value: 16, series: 'A' },
  { step: 1, value: 7, series: 'B' },
  { step: 3, value: 13, series: 'A' },
  { step: 2, value: 12, series: 'B' },
  { step: 1, value: 10, series: 'A' },
];

const Demo: FC = () => (
  <Plot
    data={rows}
    model={[
      { name: 'step', type: 'continuous' },
      { name: 'value', type: 'continuous' },
      { name: 'series', type: 'categorical' },
    ]}
    width={380}
    height={240}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark x="step" y="value" size={12} fill="#bfdbfe" stroke="#1d4ed8" zIndex={2} />
    <PathMark x="step" y="value" order="step" series="series" color="series" strokeWidth={3} zIndex={1} />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
