import type { FC } from 'react';

import { IntervalMark, Plot, PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { BAR_TRANSFORM_GAP_ID, barTransformOperationOf, previewControlContract } from './bar-transform.controls';
import { storeRevenue } from './bar-transform.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot data={storeRevenue} width={620} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark x="segment" y="revenue" fill="#94a3b8" opacity={0.45} minimumSize={6} />
    <IntervalMark
      x="segment"
      bounds={{ y: { kind: 'extent', from: 'y0', to: 'y1' } }}
      color="segment"
      label="store"
      transform={[barTransformOperationOf(values)]}
    />
    <PlotScale dimension="x" type="band" paddingInner={values[BAR_TRANSFORM_GAP_ID]} paddingOuter={0.15} />
    <PlotScale dimension="y" type="linear" domainPadding={0} />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
