import type { FC } from 'react';

import { Axis, Plot, PointMark, ReferenceMark, Scale } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, RULE_BAND_CONTROL_IDS } from './rule-band.controls';
import { scores } from './rule-threshold.data';

/** 参考带：同一轴区间在笛卡尔与极坐标下投影为带、环带或扇形楔 */
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot
    data={scores}
    model={[
      { name: 'attempt', type: 'continuous' },
      { name: 'score', type: 'continuous' },
    ]}
    width={400}
    height={280}
    coordinate={values[RULE_BAND_CONTROL_IDS.coordinate] === 'polar2D' ? 'polar2D' : undefined}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <Scale dimension="x" type="linear" domain={[0, 120]} />
    <Scale dimension="y" type="linear" domain={[0, 100]} />
    {values[RULE_BAND_CONTROL_IDS.axis] === 'x' ? (
      <ReferenceMark x={values[RULE_BAND_CONTROL_IDS.start]} xTo={values[RULE_BAND_CONTROL_IDS.end]} color="#fde68a" />
    ) : (
      <ReferenceMark y={values[RULE_BAND_CONTROL_IDS.start]} yTo={values[RULE_BAND_CONTROL_IDS.end]} color="#fde68a" />
    )}
    <PointMark x="attempt" y="score" />
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
