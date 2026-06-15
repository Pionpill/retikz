import type { FC } from 'react';
import { Axis, LineMark, Plot, Scale } from '@retikz/plot-react';

import { visits } from './plot-extra.data';

const Demo: FC = () => (
  <Plot data={visits} width={420} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <LineMark x="date" y="value" order="date" />
    <Scale dimension="x" type="time" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
