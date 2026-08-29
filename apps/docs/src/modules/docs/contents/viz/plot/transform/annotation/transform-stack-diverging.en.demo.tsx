import { IntervalMark, Plot, PlotAxis, PlotScale, PlotTransform } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { stackDivergingOperation } from './transform-stack-diverging.controls';
import { signedProductChange } from './transform-stack-diverging.data';
import { previewControlContract, stackDivergingControls } from './transform-stack-diverging.en.controls';

/** 注册回退使用的英文正负分流堆叠控件 */
export const previewControls = stackDivergingControls;

const controlledPreview = defineControlledPreview(previewControlContract, () => (
  <Plot data={signedProductChange} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <PlotTransform {...stackDivergingOperation} />
    <PlotScale dimension="y" type="linear" domain={[-45, 70]} />
    <IntervalMark x="quarter" color="product" bounds={{ y: { kind: 'extent', from: 'y0', to: 'y1' } }} />
    <PlotAxis dimension="x" title="Quarter" />
    <PlotAxis dimension="y" title="Change" grid />
  </Plot>
));

/** canonical 状态派生的英文稳定源码配置 */
export const previewSource = controlledPreview.source;

/** Shows positive and negative segments accumulating on opposite sides of zero */
export default controlledPreview.Component;
