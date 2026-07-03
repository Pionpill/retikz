import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark } from '@retikz/plot-react';

import { releaseRows } from './coordinate-composition-x-axis.data';

const Demo: FC = () => (
  <Plot data={releaseRows} width={520} height={250}>
    <Axis dimension="x" title="elapsed day" />
    <Axis id="calendar" dimension="x" placement={{ kind: 'side', side: 'top' }} title="calendar day" />
    <Axis dimension="y" title="completion" />
    <PathMark x="elapsedDay" y="completed" order="elapsedDay" stroke="darkorange" strokeWidth={2.5} />
    <PathMark x="calendarDay" y="forecast" order="calendarDay" xAxisId="calendar" stroke="steelblue" strokeWidth={2} />
    <PointMark x="calendarDay" y="forecast" xAxisId="calendar" fill="lightblue" stroke="steelblue" strokeWidth={1} />
  </Plot>
);

export default Demo;
