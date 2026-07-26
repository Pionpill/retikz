import { Axis, IntervalMark, Plot, Scale, Transform } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { measurements } from './transform-histogram.data';
import { histogramControls, previewControlContract } from './transform-histogram.en.controls';

/** 注册回退使用的分箱英文控件 */
export const previewControls = histogramControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const thresholds = values.thresholdPreset === 'focused' ? [3, 5, 7, 10, 14] : [4, 8, 12, 16];

  return (
    <Plot data={measurements} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
      {values.strategy === 'count' ? (
        <Transform kind="bin" field="measurement" count={values.count} extent={[0, 20]} nice={false} />
      ) : values.strategy === 'step' ? (
        <Transform kind="bin" field="measurement" step={values.step} extent={[0, 20]} />
      ) : (
        <Transform kind="bin" field="measurement" thresholds={thresholds} extent={[0, 20]} />
      )}
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
