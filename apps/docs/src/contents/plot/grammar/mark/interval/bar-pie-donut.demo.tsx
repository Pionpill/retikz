import { IntervalMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { traffic } from './bar-pie.data';

const Demo: FC = () => (
  <div className="grid grid-cols-2 gap-4">
    <Plot data={traffic} width={210} height={210} coordinate="polar2D" style={{ maxWidth: '100%', height: 'auto' }}>
      <IntervalMark angle="value" color="source" />
    </Plot>
    <Plot
      data={traffic}
      width={210}
      height={210}
      coordinate={{ type: 'polar2D', innerRadius: 0.6 }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <IntervalMark angle="value" color="source" />
    </Plot>
  </div>
);

export default Demo;
