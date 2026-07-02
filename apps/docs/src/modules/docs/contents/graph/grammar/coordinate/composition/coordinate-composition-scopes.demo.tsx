import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark } from '@retikz/plot-react';

import { weatherRows } from './coordinate-composition-scopes.data';

const Demo: FC = () => (
  <Plot data={weatherRows} width={520} height={250}>
    <Axis dimension="x" title="day" />
    <Axis dimension="y" title="temperature" />
    <Axis id="rainfall" dimension="y" placement={{ kind: 'side', side: 'right' }} title="rainfall" />
    <PathMark x="day" y="temperature" order="day" stroke="darkorange" strokeWidth={2.5} />
    <PathMark x="day" y="rainfall" order="day" yAxisId="rainfall" stroke="steelblue" strokeWidth={2} />
    <PointMark x="day" y="rainfall" yAxisId="rainfall" fill="lightblue" stroke="steelblue" strokeWidth={1} />
  </Plot>
);

export default Demo;
