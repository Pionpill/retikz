import { PathMark, Plot, PlotAxis } from '@retikz/plot-react';
import type { FC } from 'react';

import { pathEntryRows } from './path-entry.data';

/** 按月份连接三条营收记录 */
const PathEntry: FC = () => (
  <Plot data={pathEntryRows} width={360} height={220}>
    <PathMark x="month" y="revenue" order="month" />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" />
  </Plot>
);

export default PathEntry;
