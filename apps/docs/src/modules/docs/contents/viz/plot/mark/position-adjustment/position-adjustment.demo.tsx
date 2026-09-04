import type { FC } from 'react';

import { Plot, PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';

import { positionAdjustmentRows } from './position-adjustment.data';
import { screenNudge } from './position-adjustment.definition';

/** 自定义 screen-space initializer 的定义、注入与引用闭环 */
const Demo: FC = () => (
  <Plot data={positionAdjustmentRows} width={420} height={260} positionAdjustmentDefinitions={[screenNudge]}>
    <PointMark
      x="category"
      y="value"
      size={7}
      color={{ kind: 'constant', value: '#dc2626' }}
      placement={{ adjustments: [{ kind: 'screen-nudge', dx: 12, dy: -8 }] }}
    />
    <PlotScale dimension="x" type="point" />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);

export default Demo;
