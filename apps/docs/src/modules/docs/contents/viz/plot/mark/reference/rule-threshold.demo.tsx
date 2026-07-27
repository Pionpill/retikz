import type { FC } from 'react';

import { Axis, Plot, PointMark, ReferenceMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, RULE_THRESHOLD_VALUE_ID } from './rule-threshold.controls';
import { scores } from './rule-threshold.data';

/** 阈值线：散点 + 一条 y=60 水平 rule（数字常量 → value，跨满 x 域，crimson 描边） */
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
      <PointMark x="name" y="score" />
      <ReferenceMark y={values[RULE_THRESHOLD_VALUE_ID]} color="crimson" />
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
      <PointMark x="name" y="score" />
      <ReferenceMark y={values[RULE_THRESHOLD_VALUE_ID]} color="crimson" />
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
