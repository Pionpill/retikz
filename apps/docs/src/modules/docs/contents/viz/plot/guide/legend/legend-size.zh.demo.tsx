import { Axis, Legend, Plot, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { cities } from './legend.data';
import { legendSizeControls, previewControlContract } from './legend-size.controls';

/** 注册回退使用的尺寸图例控件 */
export const previewControls = legendSizeControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot
    data={cities}
    model={[
      { name: 'lng', type: 'continuous' },
      { name: 'lat', type: 'continuous' },
      { name: 'pop', type: 'continuous' },
    ]}
    width={360}
    height={260}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark x="lng" y="lat" size="pop" />
    <Legend
      channel="size"
      position={values.position}
      orient={values.orient === 'auto' ? undefined : values.orient}
      title="人口"
      style={{ symbolSize: values.symbolSize, symbolFit: values.symbolFit }}
    />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** size 梯度符号：连续字段通过 sqrt scale 生成代表大小与数值标签 */
export default controlledPreview.Component;
