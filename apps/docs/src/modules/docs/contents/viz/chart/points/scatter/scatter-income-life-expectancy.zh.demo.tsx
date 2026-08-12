import type { FC } from 'react';

import { ChartNote, ChartSource, ChartSubtitle, ChartTitle, ScatterChart } from '@retikz/chart-react';
import { Legend } from '@retikz/plot-react';
import { Text } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  previewControlContract,
  SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS,
} from './scatter-income-life-expectancy.controls';
import { countryScatterData } from './scatter-income-life-expectancy.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ScatterChart
    data={countryScatterData}
    encoding={{
      x: { field: 'gdpPerCapita' },
      y: { field: 'lifeExpectancy' },
      color: { field: 'continent' },
    }}
    mark={{
      size: { kind: 'constant', value: values[SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.pointSize] },
      opacity: { kind: 'constant', value: values[SCATTER_INCOME_LIFE_EXPECTANCY_CONTROL_IDS.pointOpacity] },
    }}
    width={800}
    height={400}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <ChartSubtitle>
      <Text font={{ weight: 'bold' }}>Gapminder 2007</Text>
      <Text>142 个国家；横轴为人均 GDP（经通胀调整美元），纵轴为出生时预期寿命（年）</Text>
    </ChartSubtitle>
    <ChartTitle>人均收入越高，预期寿命通常越长</ChartTitle>
    <ChartSource>Gapminder：2007 年国家截面；按大洲着色</ChartSource>
    <ChartNote>这是同年各国的横截面比较，不能据此推断因果关系</ChartNote>
    <Legend channel="color" title="大洲" position="right" />
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
