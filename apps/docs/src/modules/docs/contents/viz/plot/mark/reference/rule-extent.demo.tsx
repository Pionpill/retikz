import type { FC } from 'react';

import { Axis, Legend, Plot, PointMark, ReferenceMark, Scale } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, RULE_EXTENT_INSET_ID } from './rule-extent.controls';
import { referenceSpans } from './rule-extent.data';

/** 用逐行字段限制参考线在对侧轴上的起止范围 */
const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const inset = values[RULE_EXTENT_INSET_ID];
  const data = referenceSpans.map(row => ({
    ...row,
    spanStart: Number(row.spanStart) + inset,
    spanEnd: Number(row.spanEnd) - inset,
  }));

  return (
    <Plot
      data={data}
      model={[
        { name: 'tier', type: 'categorical' },
        { name: 'threshold', type: 'continuous' },
        { name: 'spanStart', type: 'continuous' },
        { name: 'spanEnd', type: 'continuous' },
      ]}
      width={580}
      height={260}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <Scale dimension="x" type="linear" domain={[0, 120]} />
      <Scale dimension="y" type="linear" domain={[15, 95]} />
      <ReferenceMark y="threshold" extentField="spanStart" extentToField="spanEnd" color="tier" strokeWidth={2} />
      <PointMark x="spanStart" y="threshold" color="tier" minimumSize={6} />
      <PointMark x="spanEnd" y="threshold" color="tier" minimumSize={6} />
      <Axis dimension="x" grid />
      <Axis dimension="y" />
      <Legend channel="color" />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
