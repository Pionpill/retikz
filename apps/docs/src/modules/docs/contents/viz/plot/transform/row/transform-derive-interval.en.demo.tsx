import { IntervalMark, Plot, PlotAxis, PlotScale, PlotTransform } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { deriveIntervalOperationOf } from './transform-derive-interval.controls';
import { tasks } from './transform-derive-interval.data';
import { deriveIntervalControls, previewControlContract } from './transform-derive-interval.en.controls';

/** 注册回退使用的英文派生区间控件 */
export const previewControls = deriveIntervalControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot data={tasks} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <PlotTransform {...deriveIntervalOperationOf(values)} />
    <PlotScale dimension="y" type="linear" domain={[0, 12]} />
    <IntervalMark x="task" color="phase" bounds={{ y: { kind: 'extent', from: 'y0', to: 'y1' } }} />
    <PlotAxis dimension="x" title="Task" />
    <PlotAxis dimension="y" title="Progress" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 在显式起止字段与基线模式之间切换的英文派生区间试验场 */
export default controlledPreview.Component;
