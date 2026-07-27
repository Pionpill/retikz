import type { FC } from 'react';

import { Axis, Plot, PointMark, ReferenceMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, RULE_REGION_CONTROL_IDS } from './rule-region.controls';
import { regionSamples } from './rule-region.data';

/** 参考区域：左侧笛卡尔矩形，右侧极坐标扇环，二者共用 projectCell 下沉路径。 */
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout width={620} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot
      data={regionSamples}
      model={[
        { name: 'x', type: 'continuous' },
        { name: 'y', type: 'continuous' },
      ]}
      width={300}
      height={220}
      x={0}
      y={30}
    >
      <ReferenceMark
        kind="region"
        x={values[RULE_REGION_CONTROL_IDS.xStart]}
        xTo={values[RULE_REGION_CONTROL_IDS.xEnd]}
        y={55}
        yTo={80}
        color="#bfdbfe"
        fillOpacity={0.55}
      />
      <PointMark x="x" y="y" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot
      data={regionSamples}
      model={[
        { name: 'x', type: 'continuous' },
        { name: 'y', type: 'continuous' },
      ]}
      width={260}
      height={260}
      coordinate="polar2D"
      x={350}
      y={0}
    >
      <ReferenceMark
        kind="region"
        x={values[RULE_REGION_CONTROL_IDS.xStart]}
        xTo={values[RULE_REGION_CONTROL_IDS.xEnd]}
        y={55}
        yTo={80}
        color="#bfdbfe"
        fillOpacity={0.55}
      />
      <PointMark x="x" y="y" />
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
