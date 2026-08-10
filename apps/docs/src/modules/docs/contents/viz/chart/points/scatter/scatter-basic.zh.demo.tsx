import type { FC } from 'react';

import { Axis, Plot, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, SCATTER_BASIC_CONTROL_IDS } from './scatter-basic.controls';
import { vehicleScatterData } from './scatter-basic.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot data={vehicleScatterData} width={800} height={400} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark
      x="weight"
      y="efficiency"
      size={values[SCATTER_BASIC_CONTROL_IDS.pointSize]}
      opacity={values[SCATTER_BASIC_CONTROL_IDS.pointOpacity]}
      color={values[SCATTER_BASIC_CONTROL_IDS.colorByGroup] ? 'group' : undefined}
    />
    <Axis dimension="x" title="重量 (kg)" />
    <Axis dimension="y" title="效率 (km/L)" />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 展示两个连续变量关系的基础散点图 */
const Demo: FC = controlledPreview.Component;

export default Demo;
