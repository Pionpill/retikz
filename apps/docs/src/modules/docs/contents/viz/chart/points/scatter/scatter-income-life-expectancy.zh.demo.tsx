import type { FC } from 'react';

import { ChartNote, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart, ScatterMark } from '@retikz/chart-react/point/scatter';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  previewControlContract,
  SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS,
} from './scatter-income-life-expectancy.controls';
import { countryScatterData } from './scatter-income-life-expectancy.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ScatterChart
    data={countryScatterData}
    encodings={{
      x: 'gdpPerCapita',
      y: 'lifeExpectancy',
      color: 'continent',
    }}
    width={800}
    height={400}
  >
    <ChartTitle>人均收入越高，预期寿命通常越长</ChartTitle>
    <ChartSubtitle>
      Gapminder 2007；142 个国家；横轴为人均 GDP（经通胀调整美元），纵轴为出生时预期寿命（年）
    </ChartSubtitle>
    <ChartNote>这是同年各国的横截面比较，不能据此推断因果关系</ChartNote>
    <ChartSource>Gapminder：2007 年国家截面；按大洲着色</ChartSource>
    <ScatterMark
      properties={{
        size: values[SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.pointSize],
        opacity: values[SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.pointOpacity],
      }}
    />
  </ScatterChart>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: {
    'chart.data': { name: 'countryScatterData', from: './scatter-income-life-expectancy.data' },
  },
};

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 展示人均收入与预期寿命关系的散点图 */
const Demo: FC = controlledPreview.Component;

export default Demo;
