import type { FC } from 'react';

import { Axis, Facet, PathMark, Plot, PointMark } from '@retikz/plot-react';

import { rangeRows } from './coordinate-composition-facet-shared-scale.data';

const Demo: FC = () => (
  <Plot data={rangeRows} width={500} height={250}>
    <Facet id="ranges" column={{ field: 'range', order: ['0-100', '0-50'] }} layout={{ panelGap: 20 }}>
      <Axis dimension="x" title="week" />
      <Axis dimension="y" grid title="score" />
      <PathMark x="week" y="score" order="week" stroke="darkorange" strokeWidth={2.5} />
      <PointMark x="week" y="score" fill="white" stroke="darkorange" strokeWidth={1.5} />
    </Facet>
  </Plot>
);

export default Demo;
