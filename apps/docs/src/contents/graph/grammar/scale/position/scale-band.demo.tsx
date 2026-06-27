import { Axis, IntervalMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { segments } from './scale-band.data';

/** segment 声明为 categorical，x 自动走 band：每个类别占等宽一格，柱落在格中央 */
const Demo: FC = () => (
  <Plot
    data={segments}
    model={[
      { name: 'segment', type: 'categorical' },
      { name: 'revenue', type: 'continuous' },
    ]}
    width={380}
    height={220}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <IntervalMark x="segment" y="revenue" color="segment" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
