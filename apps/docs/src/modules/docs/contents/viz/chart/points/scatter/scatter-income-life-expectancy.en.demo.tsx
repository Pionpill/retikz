import type { FC } from 'react';

import { Axis, Plot, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS } from './scatter-income-life-expectancy.controls';
import { countryScatterData } from './scatter-income-life-expectancy.data';
import { previewControlContract } from './scatter-income-life-expectancy.en.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot data={countryScatterData} width={800} height={400} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark
      x="gdpPerCapita"
      y="lifeExpectancy"
      size={values[SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.pointSize]}
      opacity={values[SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.pointOpacity]}
    />
    <Axis dimension="x" title="GDP per capita (inflation-adjusted US$)" scale="log" />
    <Axis dimension="y" title="Life expectancy at birth (years)" />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 展示人均收入与预期寿命关系的散点图 */
const Demo: FC = controlledPreview.Component;

export default Demo;
