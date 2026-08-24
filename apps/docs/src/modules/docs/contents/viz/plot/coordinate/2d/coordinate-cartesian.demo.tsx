import { IntervalMark, PathMark, Plot, PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { coordinate2DRows } from './coordinate-2d.data';
import { coordinateCartesianControls, previewControlContract } from './coordinate-cartesian.controls';

type CoordinateCartesianValues = PreviewControlValuesFor<typeof coordinateCartesianControls>;

/** 按 control 状态渲染笛卡尔二维坐标系 */
export const renderCoordinateCartesian = (values: CoordinateCartesianValues) => (
  <Plot
    data={coordinate2DRows}
    width={380}
    height={280}
    margin={{
      top: values.marginTop,
      right: values.marginRight,
      bottom: values.marginBottom,
      left: values.marginLeft,
    }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PlotScale dimension="y" type="linear" domainPadding={0} />
    {values.markType === 'point' ? (
      <PointMark x="category" y="value" />
    ) : values.markType === 'line' ? (
      <PathMark x="category" y="value" order="order" closed={false} />
    ) : (
      <IntervalMark x="category" y="value" />
    )}
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid={values.showGrid} />
  </Plot>
);

/** 注册回退使用的笛卡尔二维坐标系控件 */
export const previewControls = coordinateCartesianControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderCoordinateCartesian);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 笛卡尔二维坐标系点线面试验场 */
export default controlledPreview.Component;
