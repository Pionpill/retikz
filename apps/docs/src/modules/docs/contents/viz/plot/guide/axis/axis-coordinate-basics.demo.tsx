import { PathMark, PlotAxis } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';
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
    <Layout
      width={340}
      height={260}
      viewBox={{ x: 0, y: 0, width: 340, height: 260 }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <Plot data={axisCoordinateBasicsRows} width={340} height={260} coordinate={isPolar ? 'polar2D' : undefined}>
        <PathMark x="dimension" y="value" order="order" closed={isPolar} stroke="#2563eb" />
        {values.showX ? <PlotAxis dimension="x" /> : null}
        {values.showY ? <PlotAxis dimension="y" grid={values.showGrid} ticks={{ count: values.tickCount }} /> : null}
      </Plot>
    </Layout>
  );
};

const controlledPreview = defineControlledPreview(previewControlContract, renderCoordinateBasics);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 在同一数据与 mark 上比较笛卡尔和极坐标轴职责 */
export default controlledPreview.Component;
