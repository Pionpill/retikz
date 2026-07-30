import { Axis, IntervalMark, Plot, Scale, Transform } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  previewControlContract,
  stackDivergingControls,
  stackDivergingOperation,
} from './transform-stack-diverging.controls';
import { signedProductChange } from './transform-stack-diverging.data';

/** 注册回退使用的正负分流堆叠控件 */
export const previewControls = stackDivergingControls;

const controlledPreview = defineControlledPreview(previewControlContract, () => (
  <Plot data={signedProductChange} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Transform {...stackDivergingOperation} />
    <Scale dimension="y" type="linear" domain={[-45, 70]} />
    <IntervalMark x="quarter" color="product" bounds={{ y: { kind: 'extent', from: 'y0', to: 'y1' } }} />
    <Axis dimension="x" title="季度" />
    <Axis dimension="y" title="变化" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 展示正值向上、负值向下分别累积的 diverging stack */
export default controlledPreview.Component;
