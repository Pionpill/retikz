import { IntervalMark, Plot, PlotAxis, PlotScale, PlotTransform } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { histogramControls, histogramOperationOf, previewControlContract } from './transform-histogram.controls';
import { measurements } from './transform-histogram.data';

/** 注册回退使用的分箱控件 */
export const previewControls = histogramControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Plot data={measurements} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
      <PlotTransform {...histogramOperationOf(values)} />
      <PlotScale dimension="x" type="linear" domain={[0, 20]} />
      <PlotScale dimension="y" type="linear" domain={[0, 25]} />
      <IntervalMark x0="binStart" x1="binEnd" y="binCount" />
      <PlotAxis dimension="x" title="测量值" />
      <PlotAxis dimension="y" title="频数" grid />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 比较 count、step 与 thresholds 的分箱试验场 */
export default controlledPreview.Component;
