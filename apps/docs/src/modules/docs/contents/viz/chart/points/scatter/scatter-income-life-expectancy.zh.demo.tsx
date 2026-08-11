import type { FC } from 'react';

import { Axis, Legend, Plot, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  previewControlContract,
  SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS,
} from './scatter-income-life-expectancy.controls';
import { countryScatterData } from './scatter-income-life-expectancy.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot data={countryScatterData} width={800} height={400} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark
      x="gdpPerCapita"
      y="lifeExpectancy"
      size={values[SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.pointSize]}
      opacity={values[SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.pointOpacity]}
      color={values[SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.colorByGroup] ? 'continent' : undefined}
    />
    <Axis dimension="x" title="人均 GDP（经通胀调整美元）" scale="log" />
    <Axis dimension="y" title="出生时预期寿命（年）" />
    {values[SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.colorByGroup] ? (
      <Legend channel="color" title="大洲" position="right" />
    ) : null}
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 展示人均收入与预期寿命关系的散点图 */
const Demo: FC = controlledPreview.Component;

export default Demo;
