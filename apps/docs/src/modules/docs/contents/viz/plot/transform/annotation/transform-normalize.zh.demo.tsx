import { Axis, IntervalMark, Plot, Scale, Transform } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { normalizeControls, previewControlContract } from './transform-normalize.controls';
import { revenue } from './transform-normalize.data';

/** 注册回退使用的归一化控件 */
export const previewControls = normalizeControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot data={revenue} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Transform
      kind="normalize"
      field="amount"
      {...(values.grouping === 'quarter' ? { groupBy: ['quarter'] } : {})}
      basis={values.basis}
      as="share"
    />
    <Transform kind="stack" x="quarter" y="share" groupBy="product" />
    <Scale dimension="y" type="linear" domain={values.basis === 'percent' ? [0, 100] : [0, 1]} />
    <IntervalMark x="quarter" y="share" series="product" stack />
    <Axis dimension="x" title="季度" />
    <Axis dimension="y" title={values.basis === 'percent' ? '占比（%）' : '占比'} grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 比较归一化基准与分组范围的动态试验场 */
export default controlledPreview.Component;
