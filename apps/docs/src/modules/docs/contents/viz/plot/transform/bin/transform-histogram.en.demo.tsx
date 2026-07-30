import { Axis, IntervalMark, Plot, Scale, Transform } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { histogramOperationOf } from './transform-histogram.controls';
import { measurements } from './transform-histogram.data';
import { histogramControls, previewControlContract } from './transform-histogram.en.controls';

/** 注册回退使用的分箱英文控件 */
export const previewControls = histogramControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Plot data={measurements} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
      <Transform {...histogramOperationOf(values)} />
      <Scale dimension="x" type="linear" domain={[0, 20]} />
      <Scale dimension="y" type="linear" domain={[0, 25]} />
      <IntervalMark x0="binStart" x1="binEnd" y="binCount" />
      <Axis dimension="x" title="Measurement" />
      <Axis dimension="y" title="Frequency" grid />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** Binning playground for count, step, and thresholds */
export default controlledPreview.Component;
