import { Axis, IntervalMark, Plot, Scale, Transform } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, stackControls, stackOperationOf } from './transform-stack.controls';
import { productRevenue } from './transform-stack.data';

/** 各堆叠策略在示例中的纵轴范围 */
const yDomainByOffset: Record<string, [number, number]> = {
  zero: [0, 120],
  normalize: [0, 1],
  center: [-60, 60],
  overlap: [0, 120],
};

/** 注册回退使用的堆叠控件 */
export const previewControls = stackControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot data={productRevenue} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Transform {...stackOperationOf(values)} />
    <Scale dimension="y" type="linear" domain={yDomainByOffset[values.offset]} />
    <IntervalMark
      x="quarter"
      color="product"
      bounds={{ y: { kind: 'extent', from: 'y0', to: 'y1' } }}
      opacity={values.offset === 'overlap' ? 0.6 : 1}
    />
    <Axis dimension="x" title="季度" />
    <Axis dimension="y" title={values.offset === 'normalize' ? '占比' : '收入'} grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 比较堆叠基线策略的动态试验场 */
export default controlledPreview.Component;
