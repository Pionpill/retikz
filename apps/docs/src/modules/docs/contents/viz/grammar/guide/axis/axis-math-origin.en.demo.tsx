import type { FC } from 'react';

import { Axis, PathMark, Plot, Scale } from '@retikz/plot-react';

import { mathOriginRows } from './axis-math-origin.data';

/** Origin axes: x / y cross zero and add arrows on the positive ends. */
const Demo: FC = () => (
  <Plot data={mathOriginRows} width={360} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
    <Scale dimension="x" type="linear" domain={[-4, 4]} />
    <Scale dimension="y" type="linear" domain={[-1, 8]} />
    <PathMark x="x" y="y" order="x" stroke="#2563eb" />
    <Axis
      dimension="x"
      placement={{ kind: 'origin', origin: 0, tickSide: 'bottom' }}
      line={{ arrow: { positive: { shape: 'stealth', length: 7 } }, extent: { from: -4, to: 4 } }}
      ticks={{ values: [-4, -2, 0, 2, 4], endpoint: { distance: 12 } }}
      crossing={{ value: 0, tick: 'hide', label: 'corner', corner: 'bottom-left' }}
      title={{ text: 'x', placement: 'at-end' }}
    />
    <Axis
      dimension="y"
      placement={{ kind: 'origin', origin: 0, tickSide: 'left' }}
      line={{ arrow: { positive: { shape: 'stealth', length: 7 } }, extent: { from: -1, to: 8 } }}
      ticks={{ values: [0, 2, 4, 6, 8], endpoint: { distance: 12 } }}
      crossing={{ value: 0, tick: 'hide', label: 'hide' }}
      title={{ text: 'y', placement: 'at-end' }}
    />
  </Plot>
);

export default Demo;
