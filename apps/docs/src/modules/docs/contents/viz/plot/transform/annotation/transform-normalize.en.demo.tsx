import { Axis, IntervalMark, Plot, Scale, Transform } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { normalizeOperationsOf } from './transform-normalize.controls';
import { revenue } from './transform-normalize.data';
import { normalizeControls, previewControlContract } from './transform-normalize.en.controls';

/** 注册回退使用的归一化英文控件 */
export const previewControls = normalizeControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot data={revenue} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    {normalizeOperationsOf(values).map((operation, index) => (
      <Transform key={index} {...operation} />
    ))}
    <Scale dimension="y" type="linear" domain={values.basis === 'percent' ? [0, 100] : [0, 1]} />
    <IntervalMark x="quarter" y="share" series="product" stack />
    <Axis dimension="x" title="Quarter" />
    <Axis dimension="y" title={values.basis === 'percent' ? 'Share (%)' : 'Share'} grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** Dynamic playground for normalization basis and grouping scope */
export default controlledPreview.Component;
