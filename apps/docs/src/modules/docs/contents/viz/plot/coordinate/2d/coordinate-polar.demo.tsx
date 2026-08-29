import { IntervalMark, PathMark, Plot, PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { coordinate2DRows } from './coordinate-2d.data';
import { coordinatePolarControls, previewControlContract } from './coordinate-polar.controls';

type CoordinatePolarValues = PreviewControlValuesFor<typeof coordinatePolarControls>;

/** 按 control 状态渲染极坐标二维坐标系 */
export const renderCoordinatePolar = (values: CoordinatePolarValues) => (
  <Plot
    data={coordinate2DRows}
    width={300}
    height={300}
    coordinate={{
      type: 'polar2D',
      innerRadius: values.innerRadius,
      startAngle: values.startAngle,
      endAngle: values.startAngle + values.sweepAngle,
    }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PlotScale dimension="y" type="linear" domainPadding={0} />
    {values.markType === 'point' ? (
      <PointMark x="category" y="value" />
    ) : values.markType === 'line' ? (
      <PathMark x="category" y="value" order="order" closed />
    ) : (
      <IntervalMark x="category" y="value" />
    )}
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);

/** 注册回退使用的极坐标二维坐标系控件 */
export const previewControls = coordinatePolarControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderCoordinatePolar);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 极坐标二维坐标系点线面试验场 */
export default controlledPreview.Component;
