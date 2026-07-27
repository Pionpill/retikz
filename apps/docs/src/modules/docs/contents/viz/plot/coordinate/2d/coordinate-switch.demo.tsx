import { Axis, IntervalMark, Plot } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { coordinateSwitchControls, previewControlContract } from './coordinate-switch.controls';
import { temperature } from './coordinate-switch.data';

/** 注册回退使用的二维坐标系控件 */
export const previewControls = coordinateSwitchControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot
    data={temperature}
    coordinate={values.coordinate === 'polar2D' ? { type: 'polar2D', innerRadius: values.innerRadius } : undefined}
    width={380}
    height={280}
    margin={{
      top: values.marginTop,
      right: values.marginRight,
      bottom: values.marginBottom,
      left: values.marginLeft,
    }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <IntervalMark x="month" y="value" color="month" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 同一份数据在直角坐标与极坐标之间切换 */
export default controlledPreview.Component;
