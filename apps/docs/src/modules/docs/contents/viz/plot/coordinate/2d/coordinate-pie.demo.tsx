import { IntervalMark, Plot } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { coordinatePieControls, previewControlContract } from './coordinate-pie.controls';
import { share } from './coordinate-pie.data';

/** 注册回退使用的扇区图控件 */
export const previewControls = coordinatePieControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot
    data={share}
    width={270}
    height={270}
    coordinate={{
      type: 'polar2D',
      innerRadius: values.innerRadius,
      startAngle: values.startAngle,
      endAngle: values.startAngle + values.sweepAngle,
    }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <IntervalMark angle="value" color="label" />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 饼图、环形图与部分圆环试验场 */
export default controlledPreview.Component;
