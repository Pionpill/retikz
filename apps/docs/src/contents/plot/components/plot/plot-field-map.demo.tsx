import type { FC } from 'react';
import { Axis, LineMark, Plot } from '@retikz/plot-react';

import { renamedVisits } from './plot-extra.data';

const Demo: FC = () => (
  <Plot
    data={renamedVisits}
    model={[
      { name: 'date', type: 'temporal' },
      { name: 'visits', type: 'continuous' },
    ]}
    fieldMap={{ date: 'period', visits: 'amount' }}
    width={420}
    height={220}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <LineMark x="date" y="visits" order="date" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
