import type { FC } from 'react';

import { IntervalMark, Plot, PlotScale } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { BAR_RADIAL_GAP_ID, BAR_RADIAL_INNER_RADIUS_ID, previewControlContract } from './bar-radial.controls';
import { rainfall } from './bar-radial.data';

/** 径向柱：仅 coordinate="polar2D"，同一 IntervalMark 角向自动 band、径向是值 */
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot
    data={rainfall}
    width={260}
    height={220}
    coordinate={{ type: 'polar2D', innerRadius: values[BAR_RADIAL_INNER_RADIUS_ID] }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <IntervalMark x="month" y="value" color="month" />
    <PlotScale
      dimension="x"
      type="band"
      paddingInner={values[BAR_RADIAL_GAP_ID]}
      paddingOuter={values[BAR_RADIAL_GAP_ID] / 2}
    />
    <PlotScale dimension="y" type="linear" domainPadding={0} />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
