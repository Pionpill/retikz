import type { FC } from 'react';

import { IntervalMark, Plot, Scale } from '@retikz/plot-react';

import { rainfall } from './scale-radial.data';

/** <Scale dimension="y" type="radial" />：极坐标玫瑰图，径向走 radial scale，让扇区「面积」正比于值（南丁格尔图） */
const Demo: FC = () => (
  <Plot
    data={rainfall}
    width={320}
    height={320}
    coordinate={{ type: 'polar2D' }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <IntervalMark x="season" y="value" color="season" />
    <Scale dimension="y" type="radial" />
  </Plot>
);

export default Demo;
