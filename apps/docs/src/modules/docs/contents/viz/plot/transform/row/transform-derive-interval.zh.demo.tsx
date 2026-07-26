import { Axis, IntervalMark, Plot, Scale, Transform } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { deriveIntervalControls, previewControlContract } from './transform-derive-interval.controls';
import { tasks } from './transform-derive-interval.data';

/** 注册回退使用的派生区间控件 */
export const previewControls = deriveIntervalControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot data={tasks} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    {values.mode === 'fields' ? (
      <Transform kind="derive-interval" startFrom="start" endFrom="end" />
    ) : (
      <Transform kind="derive-interval" from="end" baseline={values.baseline} />
    )}
    <Scale dimension="y" type="linear" domain={[0, 12]} />
    <IntervalMark x="task" color="phase" bounds={{ y: { kind: 'extent', from: 'y0', to: 'y1' } }} />
    <Axis dimension="x" title="任务" />
    <Axis dimension="y" title="进度" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 在显式起止字段与基线模式之间切换的派生区间试验场 */
export default controlledPreview.Component;
