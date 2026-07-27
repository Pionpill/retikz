import type { FC } from 'react';

import { Axis, Plot, PointMark, ReferenceMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, RULE_BAND_CONTROL_IDS } from './rule-band.controls';
import { scores } from './rule-threshold.data';

/** 容差带：散点 + 水平 band y∈[60,80]（给 yTo → band，跨满 x 域，amber 填充经 projectCell 出矩形） */
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout width={620} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot
      data={scores}
      model={[
        { name: 'name', type: 'categorical' },
        { name: 'score', type: 'continuous' },
      ]}
      width={300}
      height={220}
      x={0}
      y={30}
    >
      <ReferenceMark y={values[RULE_BAND_CONTROL_IDS.start]} yTo={values[RULE_BAND_CONTROL_IDS.end]} color="#fde68a" />
      <PointMark x="name" y="score" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot
      data={scores}
      model={[
        { name: 'name', type: 'categorical' },
        { name: 'score', type: 'continuous' },
      ]}
      width={260}
      height={260}
      coordinate="polar2D"
      x={350}
      y={0}
    >
      <ReferenceMark y={values[RULE_BAND_CONTROL_IDS.start]} yTo={values[RULE_BAND_CONTROL_IDS.end]} color="#fde68a" />
      <PointMark x="name" y="score" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
