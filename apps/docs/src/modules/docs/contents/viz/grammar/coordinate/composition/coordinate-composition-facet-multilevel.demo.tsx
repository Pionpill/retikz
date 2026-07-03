import type { FC } from 'react';

import { Axis, Facet, PathMark, Plot, PointMark } from '@retikz/plot-react';

import { channelRows } from './coordinate-composition-facet-multilevel.data';

const Demo: FC = () => (
  <Plot data={channelRows} width={660} height={330}>
    <Facet
      id="regionChannel"
      row={[
        { field: 'business', order: ['consumer'] },
        { field: 'metric', order: ['revenue', 'profit'] },
      ]}
      column={[
        { field: 'region', order: ['north', 'south'] },
        { field: 'channel', order: ['online', 'store'] },
      ]}
      header={{ row: true, column: true }}
      spacing={{ panelGap: 8 }}
    >
      <Axis dimension="x" title="month" />
      <Axis dimension="y" grid title="value" />
      <PathMark x="month" y="value" order="month" stroke="darkorange" strokeWidth={2} />
      <PointMark x="month" y="value" fill="white" stroke="darkorange" strokeWidth={1.25} />
    </Facet>
  </Plot>
);

export default Demo;
