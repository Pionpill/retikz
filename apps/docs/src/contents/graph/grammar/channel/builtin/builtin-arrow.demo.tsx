import type { FC } from 'react';

import { PlotFieldType } from '@retikz/plot';
import { Axis, PathMark, Plot } from '@retikz/plot-react';

const rows = [
  { step: 1, up: 8, down: 22, both: 14 },
  { step: 2, up: 14, down: 18, both: 16 },
  { step: 3, up: 19, down: 13, both: 12 },
  { step: 4, up: 25, down: 9, both: 18 },
];

const Demo: FC = () => (
  <Plot
    data={rows}
    model={[
      { name: 'step', type: PlotFieldType.Continuous },
      { name: 'up', type: PlotFieldType.Continuous },
      { name: 'down', type: PlotFieldType.Continuous },
      { name: 'both', type: PlotFieldType.Continuous },
    ]}
    width={420}
    height={250}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PathMark x="step" y="up" order="step" strokeWidth={3} arrow="->" />
    <PathMark x="step" y="down" order="step" strokeWidth={3} arrow="<-" />
    <PathMark x="step" y="both" order="step" strokeWidth={3} arrow="<->" arrowDetail={{ length: 10, width: 7 }} />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
