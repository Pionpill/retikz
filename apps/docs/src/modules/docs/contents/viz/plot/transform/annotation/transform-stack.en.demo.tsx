import { IntervalMark, Plot, PlotAxis, PlotScale, PlotTransform } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { stackOperationOf } from './transform-stack.controls';
import { productRevenue } from './transform-stack.data';
import { previewControlContract, stackControls } from './transform-stack.en.controls';

/** 各堆叠策略在英文示例中的纵轴范围 */
const yDomainByOffset: Record<string, [number, number]> = {
  zero: [0, 120],
  normalize: [0, 1],
  center: [-60, 60],
  overlap: [0, 120],
};

/** 注册回退使用的堆叠英文控件 */
export const previewControls = stackControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot data={productRevenue} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <PlotTransform {...stackOperationOf(values)} />
    <PlotScale dimension="y" type="linear" domain={yDomainByOffset[values.offset]} />
    <IntervalMark
      x="quarter"
      color="product"
      bounds={{ y: { kind: 'extent', from: 'y0', to: 'y1' } }}
      opacity={values.offset === 'overlap' ? 0.6 : 1}
    />
    <PlotAxis dimension="x" title="Quarter" />
    <PlotAxis dimension="y" title={values.offset === 'normalize' ? 'Share' : 'Revenue'} grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** Dynamic playground for comparing stack baseline strategies */
export default controlledPreview.Component;
