import type { FC } from 'react';

import { Axis, Plot, PointMark, ReferenceMark, Scale } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  previewControlContract,
  RULE_THRESHOLD_AXIS_ID,
  RULE_THRESHOLD_COORDINATE_ID,
  RULE_THRESHOLD_VALUE_ID,
} from './rule-threshold.controls';
import { scores } from './rule-threshold.data';

/** 固定参考线：坐标系决定 line 的投影，参考轴决定直线、圆环或径向线形态 */
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot
    data={scores}
    model={[
      { name: 'attempt', type: 'continuous' },
      { name: 'score', type: 'continuous' },
    ]}
    width={400}
    height={280}
    coordinate={values[RULE_THRESHOLD_COORDINATE_ID] === 'polar2D' ? 'polar2D' : undefined}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <Scale dimension="x" type="linear" domain={[0, 120]} />
    <Scale dimension="y" type="linear" domain={[0, 100]} />
    <PointMark x="attempt" y="score" />
    {values[RULE_THRESHOLD_AXIS_ID] === 'x' ? (
      <ReferenceMark x={values[RULE_THRESHOLD_VALUE_ID]} color="crimson" />
    ) : (
      <ReferenceMark y={values[RULE_THRESHOLD_VALUE_ID]} color="crimson" />
    )}
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
