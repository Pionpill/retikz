import type { FC } from 'react';

import { Axis, Plot, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, SCATTER_BASIC_CONTROL_IDS } from './scatter-basic.controls';
import { countryScatterData } from './scatter-basic.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot data={countryScatterData} width={800} height={400} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark
      x="urbanPopulationShare"
      y="internetUseShare"
      size={values[SCATTER_BASIC_CONTROL_IDS.pointSize]}
      opacity={values[SCATTER_BASIC_CONTROL_IDS.pointOpacity]}
    />
    <Axis dimension="x" title="城镇人口占比（%）" />
    <Axis dimension="y" title="互联网使用人口占比（%）" />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 展示城市化与互联网普及关系的基础散点图 */
const Demo: FC = controlledPreview.Component;

export default Demo;
