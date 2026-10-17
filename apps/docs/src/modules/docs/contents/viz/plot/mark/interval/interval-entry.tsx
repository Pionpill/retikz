import { IntervalMark, Plot, PlotAxis } from '@retikz/plot-react';
import type { FC } from 'react';

import { intervalEntryRows } from './interval-entry.data';

/** 按季度绘制三条营收记录 */
const IntervalEntry: FC = () => (
  <Plot data={intervalEntryRows} width={360} height={220}>
    <IntervalMark x="quarter" y="revenue" />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" />
  </Plot>
);

export default IntervalEntry;
