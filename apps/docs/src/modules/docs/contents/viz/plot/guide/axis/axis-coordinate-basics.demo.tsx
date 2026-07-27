import { Axis, PathMark, Plot } from '@retikz/plot-react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { axisCoordinateBasicsControls, previewControlContract } from './axis-coordinate-basics.controls';
import { axisCoordinateBasicsRows } from './axis-coordinate-basics.data';

/** 注册回退使用的坐标系基础控件 */
export const previewControls = axisCoordinateBasicsControls;

type AxisCoordinateBasicsValues = PreviewControlValuesFor<typeof axisCoordinateBasicsControls>;

/** 渲染坐标系基础示例 */
const renderCoordinateBasics = (values: AxisCoordinateBasicsValues) => {
  const isPolar = values.coordinate === 'polar2D';

  return (
    <Plot
      data={axisCoordinateBasicsRows}
      width={340}
      height={260}
      coordinate={isPolar ? 'polar2D' : undefined}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <PathMark x="dimension" y="value" order="order" closed={isPolar} stroke="#2563eb" />
      {values.showX ? <Axis dimension="x" /> : null}
      {values.showY ? <Axis dimension="y" grid={values.showGrid} ticks={{ count: values.tickCount }} /> : null}
    </Plot>
  );
};

const controlledPreview = defineControlledPreview(previewControlContract, renderCoordinateBasics);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 在同一数据与 mark 上比较笛卡尔和极坐标轴职责 */
export default controlledPreview.Component;
