import type { FC } from 'react';

import { Axis, Plot, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { BUBBLE_BASIC_CONTROL_IDS, previewControlContract } from './bubble-basic.controls';
import { vehicleBubbleData } from './bubble-basic.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot data={vehicleBubbleData} width={800} height={400} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark
      x="weight"
      y="efficiency"
      size={values[BUBBLE_BASIC_CONTROL_IDS.sizeEncoding]}
      color={values[BUBBLE_BASIC_CONTROL_IDS.colorByGroup] ? 'group' : undefined}
      opacity={0.72}
      stroke="var(--background)"
      strokeWidth={1.5}
    />
    <Axis dimension="x" title="重量 (kg)" />
    <Axis dimension="y" title="效率 (km/L)" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 用定量字段驱动点面积的基础气泡图 */
const Demo: FC = controlledPreview.Component;

export default Demo;
