import type { FC } from 'react';

import { Axis, Plot, PointMark, ReferenceMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, RULE_REGION_CONTROL_IDS } from './rule-region.controls';
import { regionSamples } from './rule-region.data';

/** 参考区域：同一组 x / y 上下界在笛卡尔与极坐标下投影为矩形或环扇区 */
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot
    data={regionSamples}
    model={[
      { name: 'x', type: 'continuous' },
      { name: 'y', type: 'continuous' },
    ]}
    width={400}
    height={280}
    coordinate={values[RULE_REGION_CONTROL_IDS.coordinate] === 'polar2D' ? 'polar2D' : undefined}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <ReferenceMark
      kind="region"
      x={values[RULE_REGION_CONTROL_IDS.xStart]}
      xTo={values[RULE_REGION_CONTROL_IDS.xEnd]}
      y={values[RULE_REGION_CONTROL_IDS.yStart]}
      yTo={values[RULE_REGION_CONTROL_IDS.yEnd]}
      color="#bfdbfe"
      fillOpacity={0.55}
    />
    <PointMark x="x" y="y" />
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
