import { Axis, PathMark, Plot, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scaleTimeControls } from './scale-time.controls';
import { visits } from './scale-time.data';

/** 注册回退使用的时间比例尺数据面板 */
export const previewControls = scaleTimeControls;

/** temporal model 让 x 位置通道自动派生 time scale */
const controlledPreview = defineControlledPreview(previewControlContract, () => (
  <Plot
    data={visits}
    model={[
      { name: 'date', type: 'temporal' },
      { name: 'value', type: 'continuous' },
    ]}
    width={400}
    height={250}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PathMark x="date" y="value" order="date" />
    <PointMark x="date" y="value" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 通过 temporal 字段契约自动派生 time scale */
export default controlledPreview.Component;
